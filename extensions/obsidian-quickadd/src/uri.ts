import { Choice, Field } from "./types";

/** Query parameter naming the vault; confirmed by the URI spike (docs/superpowers/notes). */
export const VAULT_PARAM = "vault";

export function collectVars(fields: Field[], values: string[]): Record<string, string> {
  const vars: Record<string, string> = {};
  fields.forEach((field, index) => {
    const value = values[index] ?? "";
    vars[field.key] = value;
    if (field.rawKey !== field.key) vars[field.rawKey] = value;
  });
  return vars;
}

export function buildQuickAddUri(vaultName: string, choiceName: string, vars: Record<string, string>): string {
  const params = [`${VAULT_PARAM}=${encodeURIComponent(vaultName)}`, `choice=${encodeURIComponent(choiceName)}`];
  for (const [key, value] of Object.entries(vars)) {
    params.push(`value-${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  return `obsidian://quickadd?${params.join("&")}`;
}

/** Basic mode: quiet captures stay in the background; anything that may prompt in Obsidian comes forward. */
export function runsInBackground(choice: Choice): boolean {
  return choice.type === "Capture" && !choice.promptsInObsidian;
}

export function buildOpenUri(vaultName: string, file?: string): string {
  const params = [`vault=${encodeURIComponent(vaultName)}`];
  if (file) params.push(`file=${encodeURIComponent(file)}`);
  return `obsidian://open?${params.join("&")}`;
}

/** Basic mode runs choices by name; one whose name another choice shares can't be run safely. */
export function basicRunBlocked(choice: Choice): string | undefined {
  if (!choice.sharedName) return undefined;
  return `Another QuickAdd choice is also named "${choice.name}", and basic mode runs choices by name. Rename one of them in QuickAdd, or turn on Obsidian's command-line interface (full mode runs choices by id).`;
}
