import { IconStyle, IconMode, Appearance, type Profile } from "../types/types";

const VALID_ICON_STYLES = new Set<string>(Object.values(IconStyle));
const VALID_ICON_MODES = new Set<string>(Object.values(IconMode));
const VALID_APPEARANCES = new Set<string>(Object.values(Appearance));

export const isValidProfile = (value: unknown): value is Profile => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.wallpaperPath === "string" &&
    VALID_ICON_STYLES.has(record.iconStyle as string) &&
    VALID_ICON_MODES.has(record.iconMode as string) &&
    VALID_APPEARANCES.has(record.appearance as string)
  );
};
