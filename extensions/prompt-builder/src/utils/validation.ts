import { FormValues } from "../types";

export const validateForm = (values: FormValues) => {
  const errors: { task?: string } = {};

  if (!values.task || values.task.trim().length === 0) {
    errors.task = "The task field is required";
  }

  return errors;
};
