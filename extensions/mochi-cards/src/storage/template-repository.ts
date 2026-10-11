import { randomUUID } from "node:crypto";

import { LocalStorage } from "@raycast/api";

import {
  normalizeDeckId,
  type CardOutput,
  type CardTemplate,
  type CardTemplateDraft,
  type MochiFieldBinding,
  type MochiTemplateSnapshot,
  type MochiTemplateSnapshotField,
  type TemplateInputField,
} from "../domain/template";
import { ensurePrimaryInputField, ensurePrimaryMochiBinding, primarySourceFieldId } from "../domain/primary-field";
import { assertValidTemplate } from "../domain/template-validation";

const STORAGE_KEY = "mochi-card-templates";
const STORAGE_VERSION = 7;

type TemplateEnvelope = {
  readonly version: typeof STORAGE_VERSION;
  readonly templates: readonly CardTemplate[];
};

export interface TemplateStorage {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}

export type TemplateRepositoryErrorKind = "corrupted-data" | "template-not-found";

export class TemplateRepositoryError extends Error {
  readonly kind: TemplateRepositoryErrorKind;

  constructor(kind: TemplateRepositoryErrorKind, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TemplateRepositoryError";
    this.kind = kind;
  }
}

export class TemplateRepository {
  private readonly storage: TemplateStorage;
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(
    storage: TemplateStorage = raycastTemplateStorage,
    createId: () => string = randomUUID,
    now: () => Date = () => new Date()
  ) {
    this.storage = storage;
    this.createId = createId;
    this.now = now;
  }

  async list(): Promise<readonly CardTemplate[]> {
    const envelope = await this.readEnvelope();
    return [...envelope.templates].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async get(id: string): Promise<CardTemplate | undefined> {
    return (await this.readEnvelope()).templates.find((template) => template.id === id);
  }

  async create(draft: CardTemplateDraft): Promise<CardTemplate> {
    const normalizedDraft = normalizeDraft(draft);
    assertValidTemplate(normalizedDraft);
    const envelope = await this.readEnvelope();
    let id = this.createId();
    while (envelope.templates.some((template) => template.id === id)) {
      id = this.createId();
    }
    const template: CardTemplate = { ...normalizedDraft, id, updatedAt: this.now().toISOString() };
    await this.writeTemplates([...envelope.templates, template]);
    return template;
  }

  async update(id: string, draft: CardTemplateDraft): Promise<CardTemplate> {
    const normalizedDraft = normalizeDraft(draft);
    assertValidTemplate(normalizedDraft);
    const envelope = await this.readEnvelope();
    if (!envelope.templates.some((template) => template.id === id)) {
      throw new TemplateRepositoryError("template-not-found", "The template no longer exists");
    }
    const template: CardTemplate = { ...normalizedDraft, id, updatedAt: this.now().toISOString() };
    await this.writeTemplates(envelope.templates.map((existing) => (existing.id === id ? template : existing)));
    return template;
  }

  async duplicate(id: string): Promise<CardTemplate> {
    const envelope = await this.readEnvelope();
    const source = envelope.templates.find((template) => template.id === id);
    if (!source) {
      throw new TemplateRepositoryError("template-not-found", "The template no longer exists");
    }
    let duplicateId = this.createId();
    while (envelope.templates.some((template) => template.id === duplicateId)) {
      duplicateId = this.createId();
    }
    const duplicate: CardTemplate = {
      ...source,
      id: duplicateId,
      name: duplicateName(source.name, new Set(envelope.templates.map((template) => template.name))),
      updatedAt: this.now().toISOString(),
    };
    await this.writeTemplates([...envelope.templates, duplicate]);
    return duplicate;
  }

  async delete(id: string): Promise<boolean> {
    const envelope = await this.readEnvelope();
    const templates = envelope.templates.filter((template) => template.id !== id);
    if (templates.length === envelope.templates.length) {
      return false;
    }
    await this.writeTemplates(templates);
    return true;
  }

  private async readEnvelope(): Promise<TemplateEnvelope> {
    const storedValue = await this.storage.getItem(STORAGE_KEY);
    if (storedValue === undefined) {
      return { version: STORAGE_VERSION, templates: [] };
    }

    try {
      const parsed: unknown = JSON.parse(storedValue);
      if (isTemplateEnvelope(parsed)) {
        return { version: STORAGE_VERSION, templates: parsed.templates.map(normalizeStoredTemplate) };
      }
      if (isLegacyV6Envelope(parsed)) {
        return {
          version: STORAGE_VERSION,
          templates: parsed.templates.map((value) => normalizeStoredTemplate(migrateLegacyV6Template(value))),
        };
      }
      if (isLegacyEnvelope(parsed)) {
        return {
          version: STORAGE_VERSION,
          templates: parsed.templates.map((value) =>
            normalizeStoredTemplate(migrateLegacyTemplate(value, parsed.version))
          ),
        };
      }
      throw new Error("Stored template data does not match a supported version");
    } catch (error: unknown) {
      throw new TemplateRepositoryError(
        "corrupted-data",
        "Saved templates are corrupted. The original data was left unchanged.",
        { cause: error }
      );
    }
  }

  private async writeTemplates(templates: readonly CardTemplate[]): Promise<void> {
    await this.storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, templates } satisfies TemplateEnvelope)
    );
  }
}

const raycastTemplateStorage: TemplateStorage = {
  async getItem(key: string): Promise<string | undefined> {
    return LocalStorage.getItem<string>(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await LocalStorage.setItem(key, value);
  },
};

function normalizeDraft(draft: CardTemplateDraft): CardTemplateDraft {
  const fields = ensurePrimaryInputField(draft.fields.map(normalizeInputField), primarySourceFieldId(draft.output));
  return {
    name: draft.name.trim(),
    fields,
    cardBody: draft.cardBody,
    output: normalizeOutput(draft.output, fields),
    deckId: normalizeDeckId(draft.deckId),
    deckName: draft.deckName.trim(),
    tags: [...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean))],
    reviewReverse: draft.reviewReverse,
    archived: draft.archived,
  };
}

function normalizeStoredTemplate(template: CardTemplate): CardTemplate {
  const fields = ensurePrimaryInputField(
    template.fields.map(normalizeInputField),
    primarySourceFieldId(template.output)
  );
  return {
    ...template,
    fields,
    output: normalizeOutput(template.output, fields),
    deckId: normalizeDeckId(template.deckId),
    deckName: template.deckName.trim(),
  };
}

function normalizeInputField(field: TemplateInputField): TemplateInputField {
  if (field.type === "text") {
    return {
      id: field.id.trim(),
      name: field.name.trim(),
      type: "text",
      required: field.required,
      multiline: field.multiline,
    };
  }
  if (field.type === "number") {
    return { id: field.id.trim(), name: field.name.trim(), type: "number", required: field.required };
  }
  return { id: field.id.trim(), name: field.name.trim(), type: "boolean" };
}

function normalizeOutput(output: CardOutput, fields: readonly TemplateInputField[]): CardOutput {
  if (output.kind === "card-body") {
    return output;
  }
  if (output.target.status === "needs-configuration") {
    return {
      kind: "mochi-template",
      target: { status: "needs-configuration", templateId: output.target.templateId.trim() },
    };
  }
  const template = normalizeSnapshot(output.target.template);
  return {
    kind: "mochi-template",
    target: {
      status: "configured",
      template,
      bindings: ensurePrimaryMochiBinding(fields, template, output.target.bindings.map(normalizeBinding)),
    },
  };
}

function normalizeSnapshot(snapshot: MochiTemplateSnapshot): MochiTemplateSnapshot {
  return {
    id: snapshot.id.trim(),
    name: snapshot.name.trim(),
    fields: snapshot.fields.map((field) => ({
      id: field.id.trim(),
      name: field.name.trim(),
      type: field.type.trim() || "text",
      ...(field.pos === undefined ? {} : { pos: field.pos }),
      multiline: field.multiline,
    })),
  };
}

function normalizeBinding(binding: MochiFieldBinding): MochiFieldBinding {
  return binding.kind === "input"
    ? { kind: "input", targetFieldId: binding.targetFieldId.trim(), sourceFieldId: binding.sourceFieldId.trim() }
    : { kind: "custom", targetFieldId: binding.targetFieldId.trim(), template: binding.template };
}

function duplicateName(name: string, existingNames: ReadonlySet<string>): string {
  const base = `${name} Copy`;
  if (!existingNames.has(base)) {
    return base;
  }
  let suffix = 2;
  while (existingNames.has(`${base} ${suffix}`)) {
    suffix += 1;
  }
  return `${base} ${suffix}`;
}

function isTemplateEnvelope(value: unknown): value is TemplateEnvelope {
  return (
    isRecord(value) &&
    value.version === STORAGE_VERSION &&
    Array.isArray(value.templates) &&
    value.templates.every(isCardTemplate)
  );
}

function isCardTemplate(value: unknown): value is CardTemplate {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.fields) &&
    value.fields.every(isInputField) &&
    typeof value.cardBody === "string" &&
    isCardOutput(value.output) &&
    typeof value.deckId === "string" &&
    typeof value.deckName === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    typeof value.reviewReverse === "boolean" &&
    typeof value.archived === "boolean" &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

function isInputField(value: unknown): value is TemplateInputField {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string") {
    return false;
  }
  if (value.type === "text") {
    return typeof value.required === "boolean" && typeof value.multiline === "boolean";
  }
  if (value.type === "number") {
    return typeof value.required === "boolean";
  }
  return value.type === "boolean";
}

function isCardOutput(value: unknown): value is CardOutput {
  if (!isRecord(value)) {
    return false;
  }
  if (value.kind === "card-body") {
    return value.templateMode === "none" || value.templateMode === "deck-default";
  }
  return isMochiTemplateOutput(value);
}

function isMochiTemplateOutput(value: Record<string, unknown>): boolean {
  if (value.kind !== "mochi-template" || !isRecord(value.target)) {
    return false;
  }
  if (value.target.status === "needs-configuration") {
    return typeof value.target.templateId === "string";
  }
  return (
    value.target.status === "configured" &&
    isSnapshot(value.target.template) &&
    Array.isArray(value.target.bindings) &&
    value.target.bindings.every(isBinding)
  );
}

type LegacyV6CardOutput = { readonly kind: "card-body" } | Extract<CardOutput, { readonly kind: "mochi-template" }>;

type LegacyV6Template = Omit<CardTemplate, "output"> & { readonly output: LegacyV6CardOutput };

type LegacyV6Envelope = {
  readonly version: 6;
  readonly templates: readonly LegacyV6Template[];
};

function isLegacyV6Envelope(value: unknown): value is LegacyV6Envelope {
  return (
    isRecord(value) &&
    value.version === 6 &&
    Array.isArray(value.templates) &&
    value.templates.every(isLegacyV6Template)
  );
}

function isLegacyV6Template(value: unknown): value is LegacyV6Template {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.fields) &&
    value.fields.every(isInputField) &&
    typeof value.cardBody === "string" &&
    isLegacyV6CardOutput(value.output) &&
    typeof value.deckId === "string" &&
    typeof value.deckName === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    typeof value.reviewReverse === "boolean" &&
    typeof value.archived === "boolean" &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt))
  );
}

function isLegacyV6CardOutput(value: unknown): value is LegacyV6CardOutput {
  if (!isRecord(value)) {
    return false;
  }
  return value.kind === "card-body" || isMochiTemplateOutput(value);
}

function migrateLegacyV6Template(value: LegacyV6Template): CardTemplate {
  return {
    ...value,
    output: value.output.kind === "card-body" ? { kind: "card-body", templateMode: "none" } : value.output,
  };
}

function isSnapshot(value: unknown): value is MochiTemplateSnapshot {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.fields) &&
    value.fields.every(isSnapshotField)
  );
}

function isSnapshotField(value: unknown): value is MochiTemplateSnapshotField {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    (value.pos === undefined || typeof value.pos === "string") &&
    typeof value.multiline === "boolean"
  );
}

function isBinding(value: unknown): value is MochiFieldBinding {
  if (!isRecord(value) || typeof value.targetFieldId !== "string") {
    return false;
  }
  return value.kind === "input"
    ? typeof value.sourceFieldId === "string"
    : value.kind === "custom" && typeof value.template === "string";
}

type LegacyEnvelope = {
  readonly version: 1 | 2 | 3 | 4 | 5;
  readonly templates: readonly LegacyTemplate[];
};

type LegacyTemplate = {
  readonly id: string;
  readonly name: string;
  readonly content: string;
  readonly deckId: string;
  readonly deckName?: unknown;
  readonly fields?: unknown;
  readonly variables?: unknown;
  readonly mochiTemplateId?: unknown;
  readonly tags: readonly string[];
  readonly reviewReverse: boolean;
  readonly archived: boolean;
  readonly updatedAt: string;
};

function isLegacyEnvelope(value: unknown): value is LegacyEnvelope {
  return (
    isRecord(value) &&
    (value.version === 1 || value.version === 2 || value.version === 3 || value.version === 4 || value.version === 5) &&
    Array.isArray(value.templates) &&
    value.templates.every(isLegacyTemplate)
  );
}

function isLegacyTemplate(value: unknown): value is LegacyTemplate {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.content === "string" &&
    typeof value.deckId === "string" &&
    typeof value.reviewReverse === "boolean" &&
    typeof value.archived === "boolean" &&
    typeof value.updatedAt === "string" &&
    !Number.isNaN(Date.parse(value.updatedAt)) &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string")
  );
}

function migrateLegacyTemplate(value: LegacyTemplate, version: LegacyEnvelope["version"]): CardTemplate {
  const rawFields = legacyFields(value, version);
  const mochiTemplateId = version >= 4 && typeof value.mochiTemplateId === "string" ? value.mochiTemplateId.trim() : "";
  return {
    id: value.id,
    name: value.name,
    fields: rawFields.map((field, index) => ({
      id: `legacy-${index + 1}`,
      name: field.name,
      type: "text",
      required: field.required,
      multiline: version >= 5 ? field.multiline : false,
    })),
    cardBody: value.content,
    output: mochiTemplateId
      ? { kind: "mochi-template", target: { status: "needs-configuration", templateId: mochiTemplateId } }
      : { kind: "card-body", templateMode: "none" },
    deckId: normalizeDeckId(value.deckId),
    deckName: version === 1 ? "Unknown deck" : legacyDeckName(value.deckName),
    tags: value.tags,
    reviewReverse: value.reviewReverse,
    archived: value.archived,
    updatedAt: value.updatedAt,
  };
}

function legacyFields(
  value: LegacyTemplate,
  version: LegacyEnvelope["version"]
): readonly { readonly name: string; readonly required: boolean; readonly multiline: boolean }[] {
  const candidate = version <= 2 ? value.variables : value.fields;
  if (!Array.isArray(candidate)) {
    throw new Error("Legacy template fields are invalid");
  }
  return candidate.map((field) => {
    if (!isRecord(field) || typeof field.name !== "string" || typeof field.required !== "boolean") {
      throw new Error("Legacy template field is invalid");
    }
    return { name: field.name, required: field.required, multiline: field.multiline === true };
  });
}

function legacyDeckName(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Legacy template deck name is invalid");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
