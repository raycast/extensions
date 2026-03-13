import { FormValues, Template } from "../types";

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
