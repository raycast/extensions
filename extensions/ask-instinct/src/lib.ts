export type Runner = (script: string, args: string[]) => Promise<string>;

/** Non-empty typed argument wins, then fallback text. Whitespace-only counts as empty. */
export function pickQuery(arg?: string | null, fallback?: string | null): string {
  const a = (arg ?? "").trim();
  if (a) return a;
  return (fallback ?? "").trim();
}

/** Returns a canonical +E.164 number or lowercase email, or null if it is neither. */
export function normalizeAddress(raw: string): string | null {
  const s = raw.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return s.toLowerCase();
  const digits = s.replace(/[\s().-]/g, "");
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  if (/^\d{10}$/.test(digits)) return "+1" + digits;
  if (/^1\d{10}$/.test(digits)) return "+" + digits;
  return null;
}

// Query and address are argv only, never part of the script source.
// The script refuses to send unless Messages resolves the participant to
// exactly the requested handle (fails closed). There is no bypass.
export const SEND_SCRIPT = `
on run argv
  set theAddress to item 1 of argv
  set theText to item 2 of argv
  tell application "Messages"
    set svc to 1st service whose service type = iMessage
    set p to participant theAddress of svc
    set h to handle of p
    if h is not theAddress then error "Recipient mismatch: Messages resolved " & h
    send theText to p
  end tell
end run
`;

export async function sendToAgent(run: Runner, address: string, text: string): Promise<void> {
  const addr = normalizeAddress(address);
  if (!addr) throw new Error(`Agent address "${address}" is not a valid phone number or email`);
  if (!text.trim()) throw new Error("Empty message");
  await run(SEND_SCRIPT, [addr, text]);
}
