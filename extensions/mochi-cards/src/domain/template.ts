export type TextTemplateInputField = {
  readonly id: string;
  readonly name: string;
  readonly type: "text";
  readonly required: boolean;
  readonly multiline: boolean;
};

export type NumberTemplateInputField = {
  readonly id: string;
  readonly name: string;
  readonly type: "number";
  readonly required: boolean;
};

export type BooleanTemplateInputField = {
  readonly id: string;
  readonly name: string;
  readonly type: "boolean";
};

export type TemplateInputField = TextTemplateInputField | NumberTemplateInputField | BooleanTemplateInputField;

export type FieldValue = string | boolean;
export type FieldValues = Readonly<Record<string, FieldValue>>;

export type MochiTemplateSnapshotField = {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly pos?: string;
  readonly multiline: boolean;
};

export type MochiTemplateSnapshot = {
  readonly id: string;
  readonly name: string;
  readonly fields: readonly MochiTemplateSnapshotField[];
};

export type MochiFieldBinding =
  | { readonly kind: "input"; readonly targetFieldId: string; readonly sourceFieldId: string }
  | { readonly kind: "custom"; readonly targetFieldId: string; readonly template: string };

export type CardOutput =
  | { readonly kind: "card-body"; readonly templateMode: "none" | "deck-default" }
  | {
      readonly kind: "mochi-template";
      readonly target:
        | { readonly status: "needs-configuration"; readonly templateId: string }
        | {
            readonly status: "configured";
            readonly template: MochiTemplateSnapshot;
            readonly bindings: readonly MochiFieldBinding[];
          };
    };

export type CardTemplate = {
  readonly id: string;
  readonly name: string;
  readonly fields: readonly TemplateInputField[];
  readonly cardBody: string;
  readonly output: CardOutput;
  readonly deckId: string;
  readonly deckName: string;
  readonly tags: readonly string[];
  readonly reviewReverse: boolean;
  readonly archived: boolean;
  readonly updatedAt: string;
};

export type CardTemplateDraft = Omit<CardTemplate, "id" | "updatedAt">;

export function normalizeDeckId(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("[[") && trimmed.endsWith("]]")) {
    return trimmed.slice(2, -2).trim();
  }
  return trimmed;
}

export function fieldValueAsString(value: FieldValue | undefined): string {
  return typeof value === "boolean" ? String(value) : (value ?? "");
}
