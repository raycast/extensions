import { SENSITIVE_VALUE_PLACEHOLDER } from "../constants";

export function hideIfDefined<T>(value: T) {
  if (!value) return value;
  return SENSITIVE_VALUE_PLACEHOLDER;
}
