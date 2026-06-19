import { Creativity, creativity, FormValues, Tone, tones, Template } from "../types";

export const validateForm = (values: FormValues) => {
  const errors: { task?: string } = {};

  if (!values.task || values.task.trim().length === 0) {
    errors.task = "The task field is required";
  }

  return errors;
};

export const validateTemplateTitle = (title: string, templates: Template[], selectedTemplateId?: string) => {
  const errors: { title?: string } = {};
  const trimmedTitle = title.trim();

  if (
    templates.find((t) => t.title.trim().toLowerCase() === trimmedTitle.toLowerCase() && t.id !== selectedTemplateId)
  ) {
    errors.title = "Template title already present";
  } else if (!trimmedTitle) {
    errors.title = "Title cannot be empty";
  }

  return errors;
};

const TEMPLATE_KEYS = [
  "title",
  "role",
  "task",
  "reference",
  "format",
  "tone",
  "audience",
  "creativity",
  "example",
  "meta",
  "reasoning",
  "sources",
  "summary",
  "noEmDash",
];

export const validateTemplate = (obj: unknown): obj is Omit<Template, "id"> => {
  if (typeof obj !== "object" || obj === null) return false;

  const template = obj as Record<string, unknown>;

  if (typeof template.title !== "string" || !template.title.trim()) return false;
  if (typeof template.task !== "string") return false;

  for (const [key, value] of Object.entries(template)) {
    if (!TEMPLATE_KEYS.includes(key)) {
      console.log("Unknown key:", key);
      return false;
    }

    switch (key) {
      case "title":
      case "role":
      case "task":
      case "reference":
      case "format":
      case "audience":
      case "example":
      case "meta":
        if (value !== undefined && typeof value !== "string") return false;
        break;

      case "reasoning":
      case "sources":
      case "summary":
      case "noEmDash":
        if (value !== undefined && typeof value !== "boolean") return false;
        break;

      case "tone":
        if (value !== undefined && (typeof value !== "string" || !tones.includes(value as Tone))) return false;
        break;

      case "creativity":
        if (value !== undefined && (typeof value !== "string" || !creativity.includes(value as Creativity)))
          return false;
        break;
    }
  }
  return true;
};
