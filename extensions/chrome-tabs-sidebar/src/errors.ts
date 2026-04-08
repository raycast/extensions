const ERROR_MESSAGES: Array<{ pattern: string; hud: string }> = [
  { pattern: "Chrome is not running", hud: "Chrome is not running" },
  { pattern: "No Chrome windows", hud: "No Chrome windows found" },
  {
    pattern: "button not found",
    hud: "Sidebar button not found — is the tab sidebar enabled?",
  },
];

export function toHudMessage(error: unknown): string {
  const stderr = error instanceof Error ? error.message : "";
  const match = ERROR_MESSAGES.find(({ pattern }) => stderr.includes(pattern));
  return match?.hud ?? "Failed to toggle sidebar";
}
