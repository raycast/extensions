import { describe, expect, it } from "vitest";
import { nextState, type CardState } from "./refresh";
import type { TraceResult } from "./trace";

const trace = (ip: string, countryCode = "US"): TraceResult => ({ kind: "ok", ip, countryCode });
const completedCard: CardState = {
  kind: "success",
  ip: "1.2.3.4",
  countryCode: "US",
  country: "United States",
  city: "San Jose",
  isp: "Oracle Corporation",
  asn: 31898,
};

describe("nextState", () => {
  it("keeps the completed card when the same-IP trace omits its country code", () => {
    expect(nextState(completedCard, { kind: "ok", ip: "1.2.3.4" })).toBe(completedCard);
  });

  it("drops changed IPs back to country-only", () => {
    expect(nextState(completedCard, trace("5.6.7.8", "DE"))).toEqual({
      kind: "ip-only",
      ip: "5.6.7.8",
      countryCode: "DE",
    });
  });

  it("replaces a healthy card when the trace fails", () => {
    expect(nextState(completedCard, { kind: "unreachable" })).toEqual({ kind: "unreachable" });
  });
});
