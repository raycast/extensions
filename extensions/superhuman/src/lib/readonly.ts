import { getPreferences } from "./preferences";

type ConfirmationResult = {
  message?: string;
  image?: string;
  info?: { name: string; value?: string }[];
};

/**
 * Tools that send, delete, modify, or otherwise change account state.
 * Gated by the `readOnlyMode` preference and by every skill that declares
 * `read_only: false` in its frontmatter.
 */
export const WRITE_TOOLS = new Set<string>([
  "draft-email",
  "send-draft",
  "discard-draft",
  "undo-send",
  "mark-spam",
  "trash-thread",
  "unsubscribe",
  "update-thread",
  "update-personalization",
  "create-or-update-event",
]);

export function isReadOnly(): boolean {
  return getPreferences().readOnlyMode;
}

/**
 * Throw a user-readable error when a write tool is invoked while read-only
 * mode is enabled. Call at the top of every write tool's entry function.
 */
export function assertWritable(toolName: string): void {
  if (!isReadOnly()) return;
  if (!WRITE_TOOLS.has(toolName)) return;
  throw new Error(
    `Read-only mode is enabled. Disable "Read-only mode" in the Superhuman extension preferences to run ${toolName}.`,
  );
}

/**
 * Confirmation-stage gate: returns a blocking dialog the user can't bypass
 * when read-only mode is on. Compose with a tool's own confirmation by
 * returning this first when read-only is active.
 */
export function readOnlyConfirmation(toolName: string): ConfirmationResult | undefined {
  if (!isReadOnly() || !WRITE_TOOLS.has(toolName)) return undefined;
  return {
    message: `Read-only mode is on. Disable it in the Superhuman extension preferences to run ${toolName}.`,
    image: "🔒",
  };
}
