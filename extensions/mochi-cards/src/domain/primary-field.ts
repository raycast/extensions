import type { CardOutput, MochiFieldBinding, MochiTemplateSnapshot, TemplateInputField } from "./template";

export const MOCHI_PRIMARY_FIELD_ID = "name";

const DEFAULT_PRIMARY_FIELD_ID = "primary-name";

export function ensurePrimaryInputField(
  fields: readonly TemplateInputField[],
  preferredPrimaryId?: string
): readonly TemplateInputField[] {
  if (fields.length === 0) {
    return [{ id: DEFAULT_PRIMARY_FIELD_ID, name: "Name", type: "text", required: true, multiline: false }];
  }

  const preferredIndex = preferredPrimaryId ? fields.findIndex((field) => field.id === preferredPrimaryId) : -1;
  const primaryIndex = preferredIndex >= 0 ? preferredIndex : 0;
  const primary = fields[primaryIndex];
  const remaining = fields.filter((_, index) => index !== primaryIndex);
  if (primary.type === "number") {
    return [{ ...primary, required: true }, ...remaining];
  }
  if (primary.type === "text") {
    return [{ ...primary, required: true }, ...remaining];
  }
  return [{ id: primary.id, name: primary.name, type: "text", required: true, multiline: false }, ...remaining];
}

export function primarySourceFieldId(output: CardOutput | undefined): string | undefined {
  if (output?.kind !== "mochi-template" || output.target.status !== "configured") {
    return undefined;
  }
  const binding = output.target.bindings.find((candidate) => candidate.targetFieldId === MOCHI_PRIMARY_FIELD_ID);
  return binding?.kind === "input" ? binding.sourceFieldId : undefined;
}

export function ensurePrimaryMochiBinding(
  fields: readonly TemplateInputField[],
  template: MochiTemplateSnapshot,
  bindings: readonly MochiFieldBinding[]
): readonly MochiFieldBinding[] {
  const primary = fields[0];
  if (!primary || !template.fields.some((field) => field.id === MOCHI_PRIMARY_FIELD_ID)) {
    return bindings;
  }
  return [
    { kind: "input", targetFieldId: MOCHI_PRIMARY_FIELD_ID, sourceFieldId: primary.id },
    ...bindings.filter((binding) => binding.targetFieldId !== MOCHI_PRIMARY_FIELD_ID),
  ];
}

export function isPrimaryInputType(type: TemplateInputField["type"]): type is "text" | "number" {
  return type === "text" || type === "number";
}
