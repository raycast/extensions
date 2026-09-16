import { normalizedMochiFieldType } from "./mochi-template";
import { MOCHI_PRIMARY_FIELD_ID } from "./primary-field";
import type {
  CardTemplate,
  FieldValue,
  FieldValues,
  MochiTemplateSnapshot,
  MochiTemplateSnapshotField,
  TemplateInputField,
} from "./template";
import type { AiClient, PreparedAiSegment, PreparedSegment } from "./template-engine";
import { prepareContent, trimOuterEmptyLines } from "./template-engine";

const MAX_AI_CONCURRENCY = 4;

export type GeneratedTextSegment = { readonly kind: "text"; readonly content: string };

export type GeneratedAiSegment = {
  readonly kind: "ai";
  readonly id: string;
  readonly prompt: string;
  readonly result:
    | { readonly status: "generated"; readonly response: string }
    | { readonly status: "error"; readonly message: string; readonly previousResponse?: string };
};

export type GeneratedSegment = GeneratedTextSegment | GeneratedAiSegment;

export type GeneratedMochiField = {
  readonly target: MochiTemplateSnapshotField;
  readonly source:
    | { readonly kind: "input"; readonly value: FieldValue; readonly error?: string }
    | { readonly kind: "custom"; readonly segments: readonly GeneratedSegment[] };
};

export type GeneratedOutput =
  | { readonly kind: "card-body"; readonly segments: readonly GeneratedSegment[] }
  | {
      readonly kind: "mochi-template";
      readonly template: MochiTemplateSnapshot;
      readonly fields: readonly GeneratedMochiField[];
    };

export type GeneratedSession = { readonly mode: "generated"; readonly output: GeneratedOutput };

export type ManuallyEditedSession = {
  readonly mode: "manually-edited";
  readonly output:
    | { readonly kind: "card-body"; readonly markdown: string }
    | {
        readonly kind: "mochi-template";
        readonly template: MochiTemplateSnapshot;
        readonly fields: readonly MochiTemplateSnapshotField[];
        readonly values: FieldValues;
      };
  readonly generatedSnapshot: GeneratedSession;
};

export type GenerationSession = GeneratedSession | ManuallyEditedSession;

export type AiFieldError = { readonly id: string; readonly message: string };

export type GenerationProgress =
  | { readonly kind: "substituting-fields" }
  | { readonly kind: "generating-ai-fields"; readonly total: number }
  | { readonly kind: "ai-field-finished"; readonly number: number; readonly total: number; readonly succeeded: boolean }
  | { readonly kind: "rendering-preview" };

export async function generateSession(
  template: CardTemplate,
  values: FieldValues,
  aiClient: AiClient,
  signal?: AbortSignal,
  onProgress?: (progress: GenerationProgress) => void
): Promise<GeneratedSession> {
  onProgress?.({ kind: "substituting-fields" });
  const prepared = prepareOutput(template, values);
  const aiSegments = preparedAiSegments(prepared);
  if (aiSegments.length > 0) {
    onProgress?.({ kind: "generating-ai-fields", total: aiSegments.length });
  }
  const results = await runAiRequests(aiSegments, aiClient, signal, (number, succeeded) =>
    onProgress?.({ kind: "ai-field-finished", number, total: aiSegments.length, succeeded })
  );
  throwIfAborted(signal);
  onProgress?.({ kind: "rendering-preview" });
  const resultsById = new Map(aiSegments.map((segment, index) => [segment.id, results[index]]));
  return { mode: "generated", output: generateOutput(prepared, resultsById) };
}

export async function regenerateAll(
  session: GeneratedSession,
  aiClient: AiClient,
  signal?: AbortSignal
): Promise<GeneratedSession> {
  const aiSegments = getAiSegments(session);
  const results = await runAiRequests(aiSegments, aiClient, signal);
  throwIfAborted(signal);
  const resultsById = new Map(aiSegments.map((segment, index) => [segment.id, results[index]]));
  return { mode: "generated", output: updateOutput(session.output, resultsById) };
}

export async function regenerateField(
  session: GeneratedSession,
  fieldId: string,
  aiClient: AiClient,
  signal?: AbortSignal
): Promise<GeneratedSession> {
  const field = getAiSegments(session).find((segment) => segment.id === fieldId);
  if (!field) {
    throw new Error(`AI field not found: ${fieldId}`);
  }
  const result = await runAiRequests([field], aiClient, signal);
  throwIfAborted(signal);
  return { mode: "generated", output: updateOutput(session.output, new Map([[field.id, result[0]]])) };
}

export function editMarkdown(session: GeneratedSession, markdown: string): ManuallyEditedSession {
  if (session.output.kind !== "card-body") {
    throw new Error("Markdown editing is only available for card-body output");
  }
  return { mode: "manually-edited", output: { kind: "card-body", markdown }, generatedSnapshot: session };
}

export function editMochiValues(session: GeneratedSession, values: FieldValues): ManuallyEditedSession {
  if (session.output.kind !== "mochi-template") {
    throw new Error("Mochi field editing is only available for Mochi template output");
  }
  return {
    mode: "manually-edited",
    output: {
      kind: "mochi-template",
      template: session.output.template,
      fields: session.output.fields.map((field) => field.target),
      values,
    },
    generatedSnapshot: session,
  };
}

export function restoreGenerated(session: ManuallyEditedSession): GeneratedSession {
  return session.generatedSnapshot;
}

export function renderMarkdown(session: GenerationSession): string {
  if (session.mode === "manually-edited") {
    return session.output.kind === "card-body"
      ? session.output.markdown
      : renderMochiValues(session.output.fields, session.output.values);
  }
  if (session.output.kind === "card-body") {
    return renderSegments(session.output.segments);
  }
  const values = getMochiFieldValues(session);
  return renderMochiValues(
    session.output.fields.map((field) => field.target),
    values
  );
}

export function getMochiFieldValues(session: GenerationSession): FieldValues {
  if (session.mode === "manually-edited") {
    return session.output.kind === "mochi-template" ? session.output.values : {};
  }
  if (session.output.kind !== "mochi-template") {
    return {};
  }
  return Object.fromEntries(
    session.output.fields.map((field) => {
      if (field.source.kind === "input") {
        return [field.target.id, field.source.value];
      }
      const converted = convertValue(field.target, renderSegments(field.source.segments));
      return [field.target.id, converted.value];
    })
  );
}

export function getMochiOutput(
  session: GenerationSession
): { readonly templateId: string; readonly fields: FieldValues } | undefined {
  const output = session.mode === "generated" ? session.output : session.output;
  if (output.kind !== "mochi-template") {
    return undefined;
  }
  return { templateId: output.template.id, fields: getMochiFieldValues(session) };
}

export function getAiFieldErrors(session: GenerationSession): readonly AiFieldError[] {
  if (session.mode === "manually-edited") {
    return session.output.kind === "mochi-template"
      ? validateEditedValues(session.output.fields, session.output.values)
      : [];
  }
  const errors: AiFieldError[] = getAiSegments(session)
    .filter((segment) => segment.result.status === "error")
    .map((segment) => ({ id: segment.id, message: segment.result.status === "error" ? segment.result.message : "" }));
  if (session.output.kind === "mochi-template") {
    for (const field of session.output.fields) {
      if (field.source.kind === "input" && field.source.error) {
        errors.push({ id: `mochi:${field.target.id}`, message: field.source.error });
      } else if (field.source.kind === "custom") {
        const converted = convertValue(field.target, renderSegments(field.source.segments));
        if (converted.error) {
          errors.push({ id: `mochi:${field.target.id}`, message: converted.error });
        }
      }
    }
  }
  return errors;
}

export function isSessionReady(session: GenerationSession): boolean {
  return getAiFieldErrors(session).length === 0;
}

export function getGeneratedAiFields(session: GeneratedSession): readonly GeneratedAiSegment[] {
  return getAiSegments(session);
}

export function generationFieldTitle(session: GenerationSession | undefined, id: string): string {
  const namesById = new Map(
    session?.output.kind === "mochi-template"
      ? session.mode === "generated"
        ? session.output.fields.map((field) => [field.target.id, field.target.name] as const)
        : session.output.fields.map((field) => [field.id, field.name] as const)
      : []
  );
  const aiMatch = /^mochi:(.+):ai-field-(\d+)$/.exec(id);
  if (aiMatch) {
    return `${namesById.get(aiMatch[1]) ?? aiMatch[1]} · AI Field ${aiMatch[2]}`;
  }
  const mochiMatch = /^mochi:(.+)$/.exec(id);
  if (mochiMatch) {
    return namesById.get(mochiMatch[1]) ?? `Mochi Field ${mochiMatch[1]}`;
  }
  return `AI Field ${id.replace("ai-field-", "")}`;
}

type PreparedMochiField = {
  readonly target: MochiTemplateSnapshotField;
  readonly source:
    | { readonly kind: "input"; readonly value: FieldValue; readonly error?: string }
    | { readonly kind: "custom"; readonly segments: readonly PreparedSegment[] };
};

type PreparedOutput =
  | { readonly kind: "card-body"; readonly segments: readonly PreparedSegment[] }
  | {
      readonly kind: "mochi-template";
      readonly template: MochiTemplateSnapshot;
      readonly fields: readonly PreparedMochiField[];
    };

function prepareOutput(template: CardTemplate, values: FieldValues): PreparedOutput {
  if (template.output.kind === "card-body") {
    return { kind: "card-body", segments: prepareContent(template.cardBody, template.fields, values) };
  }
  if (template.output.target.status === "needs-configuration") {
    throw new Error("Mochi template mappings need configuration");
  }
  const sourceById = new Map(template.fields.map((field) => [field.id, field]));
  const targetById = new Map(template.output.target.template.fields.map((field) => [field.id, field]));
  return {
    kind: "mochi-template",
    template: template.output.target.template,
    fields: template.output.target.bindings.flatMap<PreparedMochiField>((binding) => {
      const target = targetById.get(binding.targetFieldId);
      if (!target) {
        throw new Error(`Mapped Mochi field no longer exists: ${binding.targetFieldId}`);
      }
      if (binding.kind === "custom") {
        return [
          {
            target,
            source: {
              kind: "custom" as const,
              segments: prepareContent(binding.template, template.fields, values, `mochi:${target.id}:`),
            },
          },
        ];
      }
      const source = sourceById.get(binding.sourceFieldId);
      if (!source) {
        throw new Error(`Mapped input field no longer exists: ${binding.sourceFieldId}`);
      }
      const value = values[source.id] ?? (source.type === "boolean" ? false : "");
      return [{ target, source: { kind: "input" as const, value, ...directValueError(source, value) } }];
    }),
  };
}

function directValueError(source: TemplateInputField, value: FieldValue): { readonly error?: string } {
  if (source.type === "boolean") {
    return typeof value === "boolean" ? {} : { error: `${source.name} must be a boolean` };
  }
  if (typeof value !== "string") {
    return { error: `${source.name} must be text` };
  }
  if (source.type === "number" && value.trim() && !Number.isFinite(Number(value))) {
    return { error: `${source.name} must be a finite number` };
  }
  if (source.required && !value.trim()) {
    return { error: `${source.name} is required` };
  }
  return {};
}

function preparedAiSegments(output: PreparedOutput): readonly PreparedAiSegment[] {
  const segments =
    output.kind === "card-body"
      ? output.segments
      : output.fields.flatMap((field) => (field.source.kind === "custom" ? field.source.segments : []));
  return segments.filter((segment): segment is PreparedAiSegment => segment.kind === "ai");
}

function generateOutput(
  output: PreparedOutput,
  resultsById: ReadonlyMap<string, PromiseSettledResult<string>>
): GeneratedOutput {
  if (output.kind === "card-body") {
    return {
      kind: "card-body",
      segments: output.segments.map((segment) => createGeneratedSegment(segment, resultsById)),
    };
  }
  return {
    kind: "mochi-template",
    template: output.template,
    fields: output.fields.map((field) => ({
      target: field.target,
      source:
        field.source.kind === "input"
          ? field.source
          : {
              kind: "custom",
              segments: field.source.segments.map((segment) => createGeneratedSegment(segment, resultsById)),
            },
    })),
  };
}

function createGeneratedSegment(
  segment: PreparedSegment,
  resultsById: ReadonlyMap<string, PromiseSettledResult<string>>
): GeneratedSegment {
  return segment.kind === "text" ? segment : updateGeneratedSegment(segment, resultsById.get(segment.id));
}

function updateOutput(
  output: GeneratedOutput,
  resultsById: ReadonlyMap<string, PromiseSettledResult<string>>
): GeneratedOutput {
  if (output.kind === "card-body") {
    return { kind: "card-body", segments: updateSegments(output.segments, resultsById) };
  }
  return {
    ...output,
    fields: output.fields.map((field) =>
      field.source.kind === "input"
        ? field
        : { ...field, source: { kind: "custom", segments: updateSegments(field.source.segments, resultsById) } }
    ),
  };
}

function updateSegments(
  segments: readonly GeneratedSegment[],
  resultsById: ReadonlyMap<string, PromiseSettledResult<string>>
): readonly GeneratedSegment[] {
  return segments.map((segment) => {
    if (segment.kind === "text") {
      return segment;
    }
    const result = resultsById.get(segment.id);
    return result ? updateGeneratedSegment(segment, result, segment) : segment;
  });
}

function updateGeneratedSegment(
  segment: PreparedAiSegment | GeneratedAiSegment,
  result: PromiseSettledResult<string> | undefined,
  previous?: GeneratedAiSegment
): GeneratedAiSegment {
  if (!result) {
    throw new Error(`Missing result for ${segment.id}`);
  }
  if (result.status === "fulfilled") {
    return {
      kind: "ai",
      id: segment.id,
      prompt: segment.prompt,
      result: { status: "generated", response: trimOuterEmptyLines(result.value) },
    };
  }
  const previousResponse = getPreviousResponse(previous);
  return {
    kind: "ai",
    id: segment.id,
    prompt: segment.prompt,
    result: {
      status: "error",
      message: errorMessage(result.reason),
      ...(previousResponse === undefined ? {} : { previousResponse }),
    },
  };
}

function getAiSegments(session: GeneratedSession): readonly GeneratedAiSegment[] {
  const segments =
    session.output.kind === "card-body"
      ? session.output.segments
      : session.output.fields.flatMap((field) => (field.source.kind === "custom" ? field.source.segments : []));
  return segments.filter((segment): segment is GeneratedAiSegment => segment.kind === "ai");
}

function renderSegments(segments: readonly GeneratedSegment[]): string {
  return segments
    .map((segment) =>
      segment.kind === "text"
        ? segment.content
        : segment.result.status === "generated"
          ? segment.result.response
          : (segment.result.previousResponse ?? "")
    )
    .join("");
}

function convertValue(
  target: MochiTemplateSnapshotField,
  rawValue: string
): { readonly value: FieldValue; readonly error?: string } {
  const type = normalizedMochiFieldType(target);
  if (type === "boolean") {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === "true" || normalized === "false") {
      return { value: normalized === "true" };
    }
    return { value: false, error: `${target.name} must produce true or false` };
  }
  if (type === "number") {
    const normalized = rawValue.trim();
    if (!normalized || !Number.isFinite(Number(normalized))) {
      return { value: rawValue, error: `${target.name} must produce a non-empty finite number` };
    }
  }
  return { value: rawValue };
}

function validateEditedValues(
  fields: readonly MochiTemplateSnapshotField[],
  values: FieldValues
): readonly AiFieldError[] {
  return fields.flatMap((field) => {
    const value = values[field.id];
    const type = normalizedMochiFieldType(field);
    if (type === "boolean") {
      return typeof value === "boolean"
        ? []
        : [{ id: `mochi:${field.id}`, message: `${field.name} must be a boolean` }];
    }
    if (typeof value !== "string") {
      return [{ id: `mochi:${field.id}`, message: `${field.name} must be text` }];
    }
    if (field.id === MOCHI_PRIMARY_FIELD_ID && !value.trim()) {
      return [{ id: `mochi:${field.id}`, message: `${field.name} is required` }];
    }
    if (type === "number" && (!value.trim() || !Number.isFinite(Number(value)))) {
      return [{ id: `mochi:${field.id}`, message: `${field.name} must be a non-empty finite number` }];
    }
    return [];
  });
}

function renderMochiValues(fields: readonly MochiTemplateSnapshotField[], values: FieldValues): string {
  return fields
    .map(
      (field) =>
        `## ${field.name}\n\n${typeof values[field.id] === "boolean" ? String(values[field.id]) : (values[field.id] ?? "")}`
    )
    .join("\n\n");
}

async function runAiRequests(
  segments: readonly PreparedAiSegment[],
  aiClient: AiClient,
  signal: AbortSignal | undefined,
  onFieldFinished?: (number: number, succeeded: boolean) => void
): Promise<readonly PromiseSettledResult<string>[]> {
  const results = new Array<PromiseSettledResult<string>>(segments.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < segments.length) {
      const index = nextIndex;
      nextIndex += 1;
      const segment = segments[index];
      try {
        throwIfAborted(signal);
        results[index] = { status: "fulfilled", value: await aiClient.ask(segment.prompt, signal) };
      } catch (reason: unknown) {
        results[index] = { status: "rejected", reason };
      }
      onFieldFinished?.(index + 1, results[index].status === "fulfilled");
    }
  }
  await Promise.all(Array.from({ length: Math.min(MAX_AI_CONCURRENCY, segments.length) }, worker));
  return results;
}

function getPreviousResponse(segment: GeneratedAiSegment | undefined): string | undefined {
  if (!segment) {
    return undefined;
  }
  return segment.result.status === "generated" ? segment.result.response : segment.result.previousResponse;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "AI request failed";
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error("Generation was cancelled");
  }
}
