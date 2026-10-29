import { isIP } from "node:net";

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
  if (!ip || isIP(ip) === 0 || !body.split(/\r?\n/).includes("h=claude.ai")) {
    return { kind: "blocked", status, reason: "not-a-trace" };
  }

  return { kind: "ok", ip, countryCode: valueFor(body, "loc")?.toUpperCase() };
}
