import { Icon } from "@raycast/api";

export const formatColorName = (name: string): string => {
  return name
    .split(/(?=[A-Z])/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const parseModelResponse = (results: string | undefined): string[] => {
  if (!results) return [];
  return results
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && Object.prototype.hasOwnProperty.call(Icon, item));
};
