import type { CaptureTextOp } from "./api";
import type { BatchReceipt } from "./envelope";

// Pure helpers for the AI Inbox capture (`capture_text`). They do not load the
// fetch client, so a test can run them without @raycast/api.

/** Trim each line and drop the blank lines. The caller checks the server limit. */
export function captureText(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

/** The op with only the fields that have a value. An unset field stays with the AI. */
export function captureTextOp(text: string, fields: Omit<CaptureTextOp, "op" | "text"> = {}): CaptureTextOp {
  const op: CaptureTextOp = { op: "capture_text", text };
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== "") Object.assign(op, { [key]: value });
  }
  return op;
}

/** The names of the created items, in text order. `created` is an array here. */
export function capturedNames(receipt: BatchReceipt | undefined): string[] {
  const result = receipt?.results?.[0]?.result as { created?: unknown } | undefined;
  if (!Array.isArray(result?.created)) return [];
  return result.created
    .map((item) => (item as { name?: unknown })?.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
}

/** The success toast: the count in the title, the names in the message. */
export function captureToast(receipt: BatchReceipt | undefined): { title: string; message?: string } {
  const names = capturedNames(receipt);
  if (names.length === 0) return { title: "Saved to Inbox" };
  if (names.length === 1) return { title: `Saved “${names[0]}” to Inbox` };
  return { title: `Added ${names.length} to Inbox`, message: names.join(" · ") };
}
