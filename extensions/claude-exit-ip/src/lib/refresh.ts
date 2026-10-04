import type { TraceResult } from "./trace";

export type CardState =
  | { kind: "loading" }
  | Exclude<TraceResult, { kind: "ok" }>
  | { kind: "ip-only"; ip: string; countryCode?: string }
  | {
      kind: "success";
      ip: string;
      countryCode: string;
      country: string;
      city: string;
      isp?: string;
      asn?: number | string;
    }
  | { kind: "geo-failed"; ip: string; countryCode?: string };

export function nextState(prev: CardState, trace: TraceResult): CardState {
  if (trace.kind !== "ok") return trace;

  if ("ip" in prev && prev.ip === trace.ip && (prev.kind === "success" || prev.kind === "geo-failed")) {
    return prev;
  }

  return { kind: "ip-only", ip: trace.ip, countryCode: trace.countryCode };
}
