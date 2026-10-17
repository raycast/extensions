import { expect, it } from "vitest";
import { needsSignIn, toClientCode } from "../src/lib/envelope";

it("keeps a known server code and maps an unknown one by status", () => {
  expect(toClientCode("read_only", 403)).toBe("read_only");
  expect(toClientCode("batch_rejected", 422)).toBe("batch_rejected");
  expect(toClientCode("stale", 409)).toBe("stale");
  expect(toClientCode("toString", 422)).toBe("validation");
  expect(toClientCode("brand_new", 429)).toBe("rate_limited");
  expect(toClientCode(undefined, 401)).toBe("unauthorized");
  expect(toClientCode(undefined, 500)).toBe("internal");
});

it("needs a sign-in only for an auth or scope refusal", () => {
  for (const code of ["signed_out", "unauthenticated", "unauthorized", "scope"] as const)
    expect(needsSignIn(code)).toBe(true);
  for (const code of ["permission", "network", "internal", "validation"] as const)
    expect(needsSignIn(code)).toBe(false);
});
