import { describe, expect, it } from "vitest";

import {
  AmbiguousMutationError,
  AuthenticationError,
  NetworkError,
  NotFoundError,
  PartialRefreshError,
  PermissionError,
  ProtocolError,
  RateLimitError,
  sanitizeForError,
  TickTickError,
  ValidationError,
} from "./errors";

describe("TickTick errors", () => {
  it("exposes stable error metadata for every domain error", () => {
    const cause = new Error("access_token=do-not-include-this");
    const errors = [
      [new TickTickError("Safe base failure.", "base", false, undefined, cause), "base", false, undefined],
      [new AuthenticationError("Please sign in."), "authentication", false, undefined],
      [new PermissionError("Permission denied."), "permission", false, undefined],
      [new RateLimitError("Try again later.", 1_500), "rate_limit", true, 1_500],
      [new ValidationError("The task title is required."), "validation", false, undefined],
      [new NotFoundError("The task no longer exists."), "not_found", false, undefined],
      [new NetworkError("Unable to reach TickTick."), "network", true, undefined],
      [new PartialRefreshError("Some projects could not be refreshed."), "partial_refresh", true, undefined],
      [new ProtocolError("TickTick returned an unsupported response."), "protocol", false, undefined],
      [new AmbiguousMutationError("The task update outcome is unknown."), "ambiguous_mutation", false, undefined],
    ] as const;

    for (const [error, code, retryable, retryAfterMs] of errors) {
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(code);
      expect(error.retryable).toBe(retryable);
      expect(error.retryAfterMs).toBe(retryAfterMs);
    }

    expect(errors[0][0].message).toBe("Safe base failure.");
    expect(errors[0][0].message).not.toContain("do-not-include-this");
    expect(JSON.stringify(errors[0][0])).not.toContain("do-not-include-this");
  });

  it("redacts credential-shaped values without retaining synthetic secrets", () => {
    const input =
      "Authorization: Bearer AuthSecret9.X; authorization: bearer LowerSecret7-Token; bearer standalone.8-token; " +
      "access_token=access-secret api_key: api.key-7 client_secret='client-secret' refresh_token=refresh-secret " +
      "id_token=id-secret token: generic.8-token key=generic-key.7";
    const output = sanitizeForError(input);

    expect(output).toBe(
      "Authorization: Bearer [REDACTED]; authorization: bearer [REDACTED]; bearer [REDACTED]; " +
        "access_token=[REDACTED] api_key: [REDACTED] client_secret=[REDACTED] refresh_token=[REDACTED] " +
        "id_token=[REDACTED] token: [REDACTED] key=[REDACTED]"
    );

    for (const secret of [
      "AuthSecret9.X",
      "LowerSecret7-Token",
      "standalone.8-token",
      "access-secret",
      "api.key-7",
      "client-secret",
      "refresh-secret",
      "id-secret",
      "generic.8-token",
      "generic-key.7",
    ]) {
      expect(output).not.toContain(secret);
    }
  });

  it("leaves ordinary prose and generic word assignments byte-for-byte unchanged", () => {
    const input = "The bearer of this letter is Alice. key: value token: reminder bearer of ordinary prose.";

    expect(sanitizeForError(input)).toBe(input);
  });
});
