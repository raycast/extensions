import { classifyMochiField, detectTemplateDrift, mochiFieldValueType } from "./mochi-template";
import type { CardTemplate, CardTemplateDraft, FieldValue, FieldValues, MochiTemplateSnapshot } from "./template";

type DeckIdentity = { readonly id: string; readonly name: string };
type CardFields = { readonly fields: readonly { readonly id: string; readonly value: FieldValue }[] };
type CardRevisionSnapshot = CardFields & {
  readonly id: string;
  readonly content: string;
  readonly deckId: string;
  readonly templateId?: string | null;
  readonly tags: readonly string[];
  readonly archived?: boolean;
  readonly position?: string;
  readonly updatedAt?: string;
};

export type CardContextSnapshot = {
  readonly generationTemplateId: string;
  readonly generationTemplateUpdatedAt: string;
  readonly mochiTemplateId: string;
  readonly inputValues: FieldValues;
};

export type GenerationTemplateResolution =
  | { readonly kind: "resolved"; readonly template: CardTemplate; readonly candidates: readonly CardTemplate[] }
  | { readonly kind: "choose"; readonly templates: readonly CardTemplate[] }
  | { readonly kind: "configure"; readonly templates: readonly CardTemplate[] }
  | { readonly kind: "duplicate"; readonly templates: readonly CardTemplate[] }
  | { readonly kind: "create" };

export function resolveGenerationTemplate(
  templates: readonly CardTemplate[],
  deckId: string,
  mochiTemplateId: string,
  context?: CardContextSnapshot
): GenerationTemplateResolution {
  const matchingDeck = templates.filter((template) => template.deckId === deckId);
  const configured = matchingDeck.filter((template) => configuredMochiTemplateId(template) === mochiTemplateId);
  const contextual = context
    ? configured.find(
        (template) => template.id === context.generationTemplateId && context.mochiTemplateId === mochiTemplateId
      )
    : undefined;
  if (contextual) {
    return { kind: "resolved", template: contextual, candidates: configured };
  }
  if (configured.length === 1) {
    return { kind: "resolved", template: configured[0], candidates: configured };
  }
  if (configured.length > 1) {
    return { kind: "choose", templates: configured };
  }

  const incomplete = matchingDeck.filter((template) => incompleteMochiTemplateId(template) === mochiTemplateId);
  if (incomplete.length > 0) {
    return { kind: "configure", templates: incomplete };
  }

  const compatible = templates.filter(
    (template) => template.deckId !== deckId && configuredMochiTemplateId(template) === mochiTemplateId
  );
  return compatible.length > 0 ? { kind: "duplicate", templates: compatible } : { kind: "create" };
}

export type AutoDraftResult = {
  readonly draft: CardTemplateDraft;
  readonly warnings: readonly string[];
};

export function createGenerationTemplateDraft(
  mochiTemplate: MochiTemplateSnapshot,
  deck: DeckIdentity
): AutoDraftResult {
  const usedNames = new Set<string>();
  const warnings: string[] = [];
  const supported = mochiTemplate.fields.filter((field) => {
    if (classifyMochiField(field) === "mappable") {
      return true;
    }
    warnings.push(`Skipped unsupported Mochi field "${field.name}" (${field.type}).`);
    return false;
  });
  const fields = supported.map((field, index) => {
    const type = mochiFieldValueType(field);
    if (!type) {
      throw new Error(`Unsupported Mochi field reached draft creation: ${field.id}`);
    }
    const name = uniqueInputName(field.name, index + 1, usedNames);
    const base = { id: `mochi-${field.id}`, name };
    if (type === "boolean") {
      return { ...base, type } as const;
    }
    if (type === "number") {
      return { ...base, type, required: false } as const;
    }
    return { ...base, type, required: false, multiline: field.multiline } as const;
  });

  return {
    draft: {
      name: mochiTemplate.name,
      fields,
      cardBody: "",
      output: {
        kind: "mochi-template",
        target: {
          status: "configured",
          template: mochiTemplate,
          bindings: supported.map((field, index) => ({
            kind: "input" as const,
            targetFieldId: field.id,
            sourceFieldId: fields[index].id,
          })),
        },
      },
      deckId: deck.id,
      deckName: deck.name,
      tags: [],
      reviewReverse: false,
      archived: false,
    },
    warnings,
  };
}

export function duplicateGenerationTemplateDraft(
  source: CardTemplate,
  deck: DeckIdentity,
  liveMochiTemplate: MochiTemplateSnapshot
): CardTemplateDraft {
  if (
    source.output.kind !== "mochi-template" ||
    source.output.target.status !== "configured" ||
    source.output.target.template.id !== liveMochiTemplate.id
  ) {
    throw new Error(`Generation Template is not configured for Mochi template "${liveMochiTemplate.name}"`);
  }

  const drift = detectTemplateDrift(source.output.target.template, liveMochiTemplate, source.output.target.bindings);
  if (drift.length > 0) {
    throw new Error(`${drift[0].message}. Reconfigure the Generation Template before copying it.`);
  }

  return {
    name: source.name,
    fields: source.fields,
    cardBody: source.cardBody,
    output: {
      kind: "mochi-template",
      target: {
        status: "configured",
        template: liveMochiTemplate,
        bindings: source.output.target.bindings,
      },
    },
    deckId: deck.id,
    deckName: deck.name,
    tags: source.tags,
    reviewReverse: source.reviewReverse,
    archived: source.archived,
  };
}

export type RestoreInputOptions = {
  readonly context?: CardContextSnapshot;
  readonly previous?: { readonly template: CardTemplate; readonly values: FieldValues };
};

export type RestoredInputValues = {
  readonly values: FieldValues;
  readonly warnings: readonly string[];
};

export function restoreInputValues(
  template: CardTemplate,
  card: CardFields,
  options: RestoreInputOptions = {}
): RestoredInputValues {
  const warnings: string[] = [];
  const values: Record<string, FieldValue> = {};
  const cardValues = new Map(card.fields.map((field) => [field.id, field.value]));
  const inverseValues = inverseDirectValues(template, cardValues);
  const contextMatches =
    options.context?.generationTemplateId === template.id &&
    options.context.mochiTemplateId === configuredMochiTemplateId(template);
  if (contextMatches && options.context?.generationTemplateUpdatedAt !== template.updatedAt) {
    warnings.push("Generation Template changed since these inputs were saved; matching field IDs were restored.");
  }

  for (const field of template.fields) {
    const contextValue = contextMatches ? options.context?.inputValues[field.id] : undefined;
    if (isValueCompatible(field.type, contextValue)) {
      values[field.id] = contextValue;
      continue;
    }

    const inverse = inverseValues.get(field.id);
    if (inverse?.kind === "value" && isValueCompatible(field.type, inverse.value)) {
      values[field.id] = inverse.value;
      continue;
    }
    if (inverse?.kind === "conflict") {
      warnings.push(`Conflicting Mochi fields map to "${field.name}"; value was not guessed.`);
    }

    const transferred =
      options.previous?.template.id === template.id
        ? ({ kind: "none" } as const)
        : transferPreviousValue(field, options.previous);
    if (transferred.kind === "value") {
      values[field.id] = transferred.value;
      continue;
    }
    if (transferred.kind === "conflict") {
      warnings.push(`Multiple previous inputs match "${field.name}"; value was not transferred.`);
    }

    values[field.id] = field.type === "boolean" ? false : "";
    warnings.push(`No saved value was found for "${field.name}".`);
  }

  return { values, warnings };
}

export function mergeUpdateFields(
  card: CardFields & { readonly templateId?: string | null },
  nextMochiTemplateId: string,
  generatedFields: FieldValues
): FieldValues {
  if (card.templateId !== nextMochiTemplateId) {
    return { ...generatedFields };
  }
  return {
    ...Object.fromEntries(card.fields.map((field) => [field.id, field.value])),
    ...generatedFields,
  };
}

export function cardChangedSinceOpen(original: CardRevisionSnapshot, current: CardRevisionSnapshot): boolean {
  return JSON.stringify(cardRevision(original)) !== JSON.stringify(cardRevision(current));
}

function configuredMochiTemplateId(template: CardTemplate): string | undefined {
  return template.output.kind === "mochi-template" && template.output.target.status === "configured"
    ? template.output.target.template.id
    : undefined;
}

function incompleteMochiTemplateId(template: CardTemplate): string | undefined {
  return template.output.kind === "mochi-template" && template.output.target.status === "needs-configuration"
    ? template.output.target.templateId
    : undefined;
}

function uniqueInputName(rawName: string, index: number, usedNames: Set<string>): string {
  const trimmed = rawName.trim();
  let base = trimmed ? trimmed.replace(/[^A-Za-z0-9_]/g, "_") : `field_${index}`;
  if (!/^[A-Za-z]/.test(base)) {
    base = `field_${base}`;
  }
  let name = base;
  let suffix = 2;
  while (usedNames.has(name)) {
    name = `${base}_${suffix}`;
    suffix += 1;
  }
  usedNames.add(name);
  return name;
}

type InverseValue = { readonly kind: "value"; readonly value: FieldValue } | { readonly kind: "conflict" };

function inverseDirectValues(
  template: CardTemplate,
  cardValues: ReadonlyMap<string, FieldValue>
): ReadonlyMap<string, InverseValue> {
  if (template.output.kind !== "mochi-template" || template.output.target.status !== "configured") {
    return new Map();
  }
  const mapped = new Map<string, FieldValue[]>();
  for (const binding of template.output.target.bindings) {
    if (binding.kind !== "input") {
      continue;
    }
    const value = cardValues.get(binding.targetFieldId);
    if (value === undefined) {
      continue;
    }
    mapped.set(binding.sourceFieldId, [...(mapped.get(binding.sourceFieldId) ?? []), value]);
  }
  return new Map(
    [...mapped.entries()].map(([fieldId, candidates]) => {
      const [first] = candidates;
      const hasConflict = candidates.some((candidate) => candidate !== first);
      return [fieldId, hasConflict ? ({ kind: "conflict" } as const) : ({ kind: "value", value: first } as const)];
    })
  );
}

type TransferredValue = { readonly kind: "none" | "conflict" } | { readonly kind: "value"; readonly value: FieldValue };

function transferPreviousValue(
  field: CardTemplate["fields"][number],
  previous: RestoreInputOptions["previous"]
): TransferredValue {
  if (!previous) {
    return { kind: "none" };
  }
  const matches = previous.template.fields.filter(
    (candidate) => candidate.name === field.name && candidate.type === field.type
  );
  if (matches.length > 1) {
    return { kind: "conflict" };
  }
  const value = matches.length === 1 ? previous.values[matches[0].id] : undefined;
  return isValueCompatible(field.type, value) ? { kind: "value", value } : { kind: "none" };
}

function isValueCompatible(
  type: CardTemplate["fields"][number]["type"],
  value: FieldValue | undefined
): value is FieldValue {
  return type === "boolean" ? typeof value === "boolean" : typeof value === "string";
}

function cardRevision(card: CardRevisionSnapshot): unknown {
  return {
    id: card.id,
    content: card.content,
    deckId: card.deckId,
    templateId: card.templateId,
    fields: [...card.fields].sort((left, right) => left.id.localeCompare(right.id)),
    tags: [...card.tags].sort(),
    archived: card.archived,
    position: card.position,
    updatedAt: card.updatedAt,
  };
}
