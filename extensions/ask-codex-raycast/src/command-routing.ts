import type { ProviderId } from "./provider";

// Keep the original command ID for existing Codex shortcuts and aliases.
export const PROVIDER_COMMANDS: Record<ProviderId, string> = {
  codex: "index",
  antigravity: "antigravity",
  qoder: "qoder",
  "qoder-cn": "qoder-cn",
  workbuddy: "workbuddy",
  gemini: "gemini",
};

export function providerForCommand(command: string): ProviderId {
  const match = Object.entries(PROVIDER_COMMANDS).find(
    ([, name]) => name === command,
  );
  if (!match) throw new Error("Unknown AI in Raycast command.");
  return match[0] as ProviderId;
}
