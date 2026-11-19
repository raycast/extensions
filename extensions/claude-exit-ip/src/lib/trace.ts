// Avoid node:net: some Raycast-compatible runtimes stub it and isIP throws.
// shortcut: shape check only (999.1.1.1 and ":" pass), tighten if a malformed address ever slips through.
const IP_SHAPE = /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-f:.]*:[0-9a-f:.]*)$/i;

export type TraceResult =
  | { kind: "ok"; ip: string; countryCode?: string }
  | { kind: "blocked"; status: number; reason: "status" | "not-a-trace" }
  | { kind: "unreachable" };

function valueFor(body: string, key: string): string | undefined {
  const line = body.split(/\r?\n/).find((candidate) => candidate.startsWith(key + "="));
  return line?.slice(key.length + 1).trim() || undefined;
}

export function parseTrace(status: number, body: string): TraceResult {
  if (status < 200 || status >= 300) return { kind: "blocked", status, reason: "status" };

  const ip = valueFor(body, "ip");
  if (!ip || !IP_SHAPE.test(ip) || !body.split(/\r?\n/).includes("h=claude.ai")) {
    return { kind: "blocked", status, reason: "not-a-trace" };
  }

  return { kind: "ok", ip, countryCode: valueFor(body, "loc")?.toUpperCase() };
}
