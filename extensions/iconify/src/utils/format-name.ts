import type { IconNameFormat } from "../types";

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

type IconNameFormatter = (options: { setId: string; iconId: string }) => string;

export const iconFormatsMap: Record<IconNameFormat, IconNameFormatter> = {
  "icon-name": (options) => options.iconId,
  IconName: (options) => toPascalCase(options.iconId),
  "set-name:icon-name": (options) => `${options.setId}:${options.iconId}`,
  "set-name-icon-name": (options) => `${options.setId.toLowerCase()}-${options.iconId.toLowerCase()}`,
  "set-name/icon-name": (options) => `${options.setId.toLowerCase()}/${options.iconId.toLowerCase()}`,
  "set-name--icon-name": (options) => `${options.setId.toLowerCase()}--${options.iconId.toLowerCase()}`,
  setNameIconName: (options) => `${toCamelCase(options.setId)}${toPascalCase(options.iconId)}`,
  SetNameIconName: (options) => `${toPascalCase(options.setId)}${toPascalCase(options.iconId)}`,
  "<SetNameIconName />": (options) => `<${toPascalCase(options.setId)}${toPascalCase(options.iconId)} />`,
  "<set-name-icon-name />": (options) => `<${options.setId.toLowerCase()}-${options.iconId.toLowerCase()} />`,
  "i-set-name:icon-name": (options) => `i-${options.setId.toLowerCase()}:${options.iconId.toLowerCase()}`,
  "i-set-name-icon-name": (options) => `i-${options.setId.toLowerCase()}-${options.iconId.toLowerCase()}`,
  "icon-[set-name--icon-name]": (options) => `icon-[${options.setId.toLowerCase()}--${options.iconId.toLowerCase()}]`,
};
