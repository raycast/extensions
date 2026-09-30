import type { Form } from "@raycast/api";
import type { Environment } from "./types";

export const ENVIRONMENT_TARGET_OPTIONS = [
  { id: "edit-form-production", label: "Production", target: "production" },
  { id: "edit-form-preview", label: "Preview", target: "preview" },
  { id: "edit-form-development", label: "Development", target: "development" },
] as const;

export function getEnvironmentTargets(values: Form.Values): Environment["target"] {
  return ENVIRONMENT_TARGET_OPTIONS.filter(({ id }) => values[id]).map(({ target }) => target);
}
