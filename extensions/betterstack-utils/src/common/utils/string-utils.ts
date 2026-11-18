import { Optional } from "@/common/utils/optional-utils";

export const toString = (value: Optional<unknown>) => (value ? String(value) : "");

export const capitalize = (value: Optional<string>) => {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
};
