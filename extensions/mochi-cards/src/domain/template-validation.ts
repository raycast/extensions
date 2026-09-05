import { classifyMochiField, isMochiBindingCompatible } from "./mochi-template";
import { MOCHI_PRIMARY_FIELD_ID } from "./primary-field";
import type {
  CardTemplate,
  CardTemplateDraft,
  MochiFieldBinding,
  MochiTemplateSnapshotField,
  TemplateInputField,
} from "./template";
import { parseTemplate, TemplateParseError, type TemplateParseErrorCode } from "./template-parser";

export type TemplateValidationErrorCode =
  | "name-required"
  | "content-required"
  | "deck-id-required"
  | "deck-name-required"
  | "field-id-required"
  | "field-id-duplicate"
  | "field-name-required"
  | "field-name-invalid"
  | "field-name-duplicate"
  | "primary-field-required"
  | "primary-field-type"
  | "primary-field-value-required"
  | "primary-mapping-required"
  | "primary-target-required"
  | "target-needs-configuration"
  | "target-unavailable"
  | "binding-target-duplicate"
  | "binding-target-stale"
  | "binding-source-stale"
  | "binding-type-incompatible"
  | "binding-target-unmappable"
  | "unknown-placeholder"
  | TemplateParseErrorCode;

export type TemplateValidationError = {
  readonly code: TemplateValidationErrorCode;
  readonly path: string;
  readonly message: string;
};

export class InvalidTemplateError extends Error {
  readonly errors: readonly TemplateValidationError[];

  constructor(errors: readonly TemplateValidationError[]) {
    super(errors.map((error) => error.message).join("; "));
    this.name = "InvalidTemplateError";
    this.errors = errors;
  }
}

const VARIABLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const PLACEHOLDER_PATTERN = /<<([^<>]+)>>/g;

export function validateTemplate(template: CardTemplate | CardTemplateDraft): readonly TemplateValidationError[] {
  const errors: TemplateValidationError[] = [];

  if (template.name.trim().length === 0) {
    errors.push({ code: "name-required", path: "name", message: "Template name is required" });
  }
  if (template.deckId.trim().length === 0) {
    errors.push({ code: "deck-id-required", path: "deckId", message: "Select a Mochi deck" });
  }
  if (template.deckName.trim().length === 0) {
    errors.push({ code: "deck-name-required", path: "deckId", message: "Select a Mochi deck" });
  }

  validateInputFields(template.fields, errors);

  if (template.output.kind === "card-body") {
    validateContent(template.cardBody, template.fields, "cardBody", true, errors);
  } else if (template.output.target.status === "needs-configuration") {
    errors.push({
      code: "target-needs-configuration",
      path: "output",
      message: "Mochi template mappings need configuration",
    });
  } else {
    validateBindings(template.fields, template.output.target.template.fields, template.output.target.bindings, errors);
  }

  return errors;
}

export function assertValidTemplate(template: CardTemplate | CardTemplateDraft): void {
  const errors = validateTemplate(template);
  if (errors.length > 0) {
    throw new InvalidTemplateError(errors);
  }
}

function validateInputFields(fields: readonly TemplateInputField[], errors: TemplateValidationError[]): void {
  const primary = fields[0];
  if (!primary) {
    errors.push({
      code: "primary-field-required",
      path: "fields",
      message: "A primary card field is required",
    });
    return;
  }
  if (primary.type === "boolean") {
    errors.push({
      code: "primary-field-type",
      path: "fields.0.type",
      message: "The primary card field must be Text or Number",
    });
  } else if (!primary.required) {
    errors.push({
      code: "primary-field-value-required",
      path: "fields.0.required",
      message: "The primary card field is always required",
    });
  }

  const ids = new Set<string>();
  const names = new Set<string>();
  fields.forEach((field, index) => {
    const id = field.id.trim();
    const name = field.name.trim();
    if (!id) {
      errors.push({ code: "field-id-required", path: `fields.${index}.id`, message: `Field ${index + 1} needs an ID` });
    } else if (ids.has(id)) {
      errors.push({
        code: "field-id-duplicate",
        path: `fields.${index}.id`,
        message: `Field ID "${id}" is duplicated`,
      });
    } else {
      ids.add(id);
    }

    if (!name) {
      errors.push({
        code: "field-name-required",
        path: `fields.${index}.name`,
        message: `Field ${index + 1} needs a name`,
      });
    } else if (!VARIABLE_NAME_PATTERN.test(name)) {
      errors.push({
        code: "field-name-invalid",
        path: `fields.${index}.name`,
        message: `Field "${name}" must start with a letter and contain only letters, digits, and _`,
      });
    } else if (names.has(name)) {
      errors.push({
        code: "field-name-duplicate",
        path: `fields.${index}.name`,
        message: `Field "${name}" is declared more than once`,
      });
    } else {
      names.add(name);
    }
  });
}

function validateBindings(
  sourceFields: readonly TemplateInputField[],
  targetFields: readonly MochiTemplateSnapshotField[],
  bindings: readonly MochiFieldBinding[],
  errors: TemplateValidationError[]
): void {
  const sourceById = new Map(sourceFields.map((field) => [field.id, field]));
  const targetById = new Map(targetFields.map((field) => [field.id, field]));
  const targetIds = new Set<string>();
  const primary = sourceFields[0];
  const primaryTarget = targetFields.find((field) => field.id === MOCHI_PRIMARY_FIELD_ID);
  const primaryBinding = bindings.find((binding) => binding.targetFieldId === MOCHI_PRIMARY_FIELD_ID);

  if (!primaryTarget) {
    errors.push({
      code: "primary-target-required",
      path: "output",
      message: "The Mochi template does not expose its primary name field",
    });
  } else if (!primary || primaryBinding?.kind !== "input" || primaryBinding.sourceFieldId !== primary.id) {
    errors.push({
      code: "primary-mapping-required",
      path: "output",
      message: "The primary input must map to the Mochi card name",
    });
  }

  bindings.forEach((binding, index) => {
    const path = `output.bindings.${index}`;
    const target = targetById.get(binding.targetFieldId);
    if (targetIds.has(binding.targetFieldId)) {
      errors.push({ code: "binding-target-duplicate", path, message: "A Mochi field can only have one mapping" });
    }
    targetIds.add(binding.targetFieldId);
    if (!target) {
      errors.push({
        code: "binding-target-stale",
        path,
        message: `Mapped Mochi field ${binding.targetFieldId} no longer exists`,
      });
      return;
    }
    if (classifyMochiField(target) !== "mappable") {
      errors.push({
        code: "binding-target-unmappable",
        path,
        message: `Mochi field "${target.name}" cannot be mapped`,
      });
      return;
    }

    if (binding.kind === "input") {
      const source = sourceById.get(binding.sourceFieldId);
      if (!source) {
        errors.push({
          code: "binding-source-stale",
          path,
          message: `Input field ${binding.sourceFieldId} no longer exists`,
        });
      } else if (!isMochiBindingCompatible(source, target)) {
        errors.push({
          code: "binding-type-incompatible",
          path,
          message: `Input "${source.name}" has an incompatible type`,
        });
      }
      return;
    }

    validateContent(binding.template, sourceFields, `${path}.template`, false, errors);
  });
}

function validateContent(
  content: string,
  fields: readonly TemplateInputField[],
  path: string,
  required: boolean,
  errors: TemplateValidationError[]
): void {
  if (required && !content.trim()) {
    errors.push({ code: "content-required", path, message: "Markdown content is required" });
  }
  const declaredNames = new Set(fields.map((field) => field.name.trim()));
  for (const placeholder of content.matchAll(PLACEHOLDER_PATTERN)) {
    const name = placeholder[1].trim();
    if (!declaredNames.has(name)) {
      errors.push({ code: "unknown-placeholder", path, message: `Unknown field: <<${name}>>` });
    }
  }
  try {
    parseTemplate(content);
  } catch (error: unknown) {
    if (error instanceof TemplateParseError) {
      errors.push({ code: error.code, path, message: error.message });
    } else {
      throw error;
    }
  }
}
