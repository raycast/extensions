import type { OwnerType, ScopeType } from "../types/shortcut";

export const GENERAL_OWNER_NAME = "General";

export function inferCustomOwnerType(ownerName: string, scope: ScopeType): OwnerType {
  const normalizedOwnerName = ownerName.trim().toLocaleLowerCase();

  if (!normalizedOwnerName || normalizedOwnerName === GENERAL_OWNER_NAME.toLocaleLowerCase()) {
    return "other";
  }

  if (scope === "webapp") {
    return "webapp";
  }

  return "mac-app";
}
