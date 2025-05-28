import { LucideIcon } from "./types";

export const toPascalCase = (string: string) => {
  const camelCase = string.replace(/^([A-Z])|[\s-_]+(\w)/g, (_match, p1, p2) =>
    p2 ? p2.toUpperCase() : p1.toLowerCase(),
  );

  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};

export const toKebabCase = (string: string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

export const parseModelResponse = (results: string | undefined, allIcons: LucideIcon[] | undefined): string[] => {
  if (!results || !allIcons) return [];
  return results
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && allIcons.some((icon) => icon.name === item));
};
