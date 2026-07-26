import type {
  MochiFieldBinding,
  MochiTemplateSnapshot,
  MochiTemplateSnapshotField,
  TemplateInputField,
} from "./template";
import { ensurePrimaryMochiBinding, isPrimaryInputType, MOCHI_PRIMARY_FIELD_ID } from "./primary-field";

export type MappableMochiFieldType = "text" | "number" | "boolean";
export type MochiFieldClassification = "mappable" | "unsupported";

const TEXT_VALUE_TYPES = new Set([
  "text",
  "ai",
  "ai-generator",
  "speech",
  "text-to-speech",
  "translate",
  "translation",
  "image",
  "image-search",
  "dictionary",
  "dictionary-lookup",
  "pinyin",
  "chinese",
  "furigana",
  "japanese",
]);

export function normalizedMochiFieldType(field: Pick<MochiTemplateSnapshotField, "type">): string {
  return field.type.trim().toLowerCase() || "text";
}

export function classifyMochiField(field: Pick<MochiTemplateSnapshotField, "type">): MochiFieldClassification {
  return mochiFieldValueType(field) === undefined ? "unsupported" : "mappable";
}

export function isMappableMochiFieldType(type: string): type is MappableMochiFieldType {
  return type === "text" || type === "number" || type === "boolean";
}

export function mochiFieldValueType(
  field: Pick<MochiTemplateSnapshotField, "type">
): MappableMochiFieldType | undefined {
  const type = normalizedMochiFieldType(field);
  if (type === "number" || type === "boolean") {
    return type;
  }
  return TEXT_VALUE_TYPES.has(type) ? "text" : undefined;
}

export function isDirectBindingCompatible(
  source: TemplateInputField,
  target: Pick<MochiTemplateSnapshotField, "type">
): boolean {
  return source.type === mochiFieldValueType(target);
}

export function createAutomaticBindings(
  fields: readonly TemplateInputField[],
  template: MochiTemplateSnapshot
): readonly MochiFieldBinding[] {
  const bindings = template.fields.flatMap((target) => {
    if (classifyMochiField(target) !== "mappable") {
      return [];
    }
    const normalizedName = target.name.trim().toLowerCase();
    const matches = fields.filter(
      (source) => source.name.trim().toLowerCase() === normalizedName && isDirectBindingCompatible(source, target)
    );
    return matches.length === 1
      ? [{ kind: "input" as const, targetFieldId: target.id, sourceFieldId: matches[0].id }]
      : [];
  });
  return ensurePrimaryMochiBinding(fields, template, bindings);
}

export function isMochiBindingCompatible(source: TemplateInputField, target: MochiTemplateSnapshotField): boolean {
  if (target.id !== MOCHI_PRIMARY_FIELD_ID) {
    return isDirectBindingCompatible(source, target);
  }
  if (!isPrimaryInputType(source.type)) {
    return false;
  }
  const targetType = mochiFieldValueType(target);
  return targetType === "text" || (targetType === "number" && source.type === "number");
}

export type TemplateDriftIssue = {
  readonly code: "target-removed" | "target-type-changed";
  readonly targetFieldId: string;
  readonly message: string;
};

export function detectTemplateDrift(
  snapshot: MochiTemplateSnapshot,
  live: MochiTemplateSnapshot,
  bindings: readonly MochiFieldBinding[]
): readonly TemplateDriftIssue[] {
  const snapshotById = new Map(snapshot.fields.map((field) => [field.id, field]));
  const liveById = new Map(live.fields.map((field) => [field.id, field]));

  return bindings.flatMap<TemplateDriftIssue>((binding) => {
    const previous = snapshotById.get(binding.targetFieldId);
    const current = liveById.get(binding.targetFieldId);
    if (!current) {
      return [
        {
          code: "target-removed" as const,
          targetFieldId: binding.targetFieldId,
          message: `Mapped Mochi field "${previous?.name ?? binding.targetFieldId}" was removed`,
        },
      ];
    }
    if (previous && mochiFieldValueType(previous) !== mochiFieldValueType(current)) {
      return [
        {
          code: "target-type-changed" as const,
          targetFieldId: binding.targetFieldId,
          message: `Mapped Mochi field "${current.name}" changed type`,
        },
      ];
    }
    return [];
  });
}

export function refreshTemplateSnapshot(
  snapshot: MochiTemplateSnapshot,
  live: MochiTemplateSnapshot
): MochiTemplateSnapshot {
  const liveById = new Map(live.fields.map((field) => [field.id, field]));
  return {
    id: live.id,
    name: live.name,
    fields: snapshot.fields.map((field) => liveById.get(field.id) ?? field),
  };
}
