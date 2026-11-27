import { Settings } from "./aws/types";
export interface PrimarySelection {
  name: string;
  preference: string;
}
export function applyPrimarySelection(raw: Settings, value: unknown): Settings {
  if (!value || typeof value !== "object" || !("name" in value) || !("preference" in value)) return raw;
  return typeof value.name === "string" && value.preference === (raw.primaryProfile || "")
    ? { ...raw, primaryProfile: value.name }
    : raw;
}
