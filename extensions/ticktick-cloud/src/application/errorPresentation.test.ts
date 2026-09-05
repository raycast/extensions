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
  ValidationError,
} from "../domain/errors";
import { presentError, type ErrorPresentation, type ErrorPresentationContext } from "./errorPresentation";

describe("presentError", () => {
  it("maps authentication, permission, and stale-task failures to distinct fixed recovery actions", () => {
    expect(presentError(new AuthenticationError("raw 401"), "read")).toEqual({
      kind: "authentication",
      title: "Reconnect TickTick",
      message: "Your TickTick connection is no longer valid. Reconnect or update authentication in preferences.",
      severity: "error",
      retainData: true,
      actions: [
        { kind: "reconnect", title: "Reconnect" },
        { kind: "open-preferences", title: "Open Preferences" },
      ],
    });

    expect(presentError(new PermissionError("raw 403"), "mutation")).toEqual({
      kind: "permission",
      title: "Permission Required",
      message: "TickTick did not grant permission for this action. Check authentication settings in preferences.",
      severity: "error",
      retainData: true,
      actions: [{ kind: "open-preferences", title: "Open Preferences" }],
    });

    expect(presentError(new NotFoundError("raw 404"), "mutation")).toEqual({
      kind: "not-found",
      title: "Task No Longer Available",
      message: "This task no longer exists in TickTick. Refresh to update the list.",
      severity: "warning",
      retainData: false,
      actions: [{ kind: "refresh", title: "Refresh" }],
    });
  });

  it("offers rate-limit retry only as a manual action and advertises only valid safe delays", () => {
    const validDelays = [0, 1_500, Number.MAX_SAFE_INTEGER];
    for (const retryAfterMs of validDelays) {
      expect(presentError(new RateLimitError("raw 429", retryAfterMs), "read")).toEqual({
        kind: "rate-limit",
        title: "TickTick Is Temporarily Busy",
        message: "TickTick is limiting requests. Retry manually when ready.",
        severity: "warning",
        retainData: true,
        actions: [{ kind: "retry", title: "Retry", mode: "manual" }],
        retryAfterMs,
      });
    }

    const invalidDelays = [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1];
    for (const retryAfterMs of invalidDelays) {
      const presentation = presentError(new RateLimitError("raw 429", retryAfterMs), "mutation");
      expect(presentation).toEqual({
        kind: "rate-limit",
        title: "TickTick Is Temporarily Busy",
        message: "TickTick is limiting requests. Retry manually when ready.",
        severity: "warning",
        retainData: true,
        actions: [{ kind: "retry", title: "Retry", mode: "manual" }],
      });
      expect("retryAfterMs" in presentation).toBe(false);
    }
  });

  it("keeps stale data and offers Refresh for read network failures but only manual Retry for mutations", () => {
    expect(presentError(new NetworkError("offline or raw 5xx"), "read")).toEqual({
      kind: "network",
      title: "TickTick Is Unreachable",
      message: "Couldn't reach TickTick. Available tasks may be out of date.",
      severity: "error",
      retainData: true,
      actions: [{ kind: "refresh", title: "Refresh" }],
    });

    expect(presentError(new NetworkError("offline or raw 5xx"), "mutation")).toEqual({
      kind: "network",
      title: "Couldn't Update Task",
      message: "Couldn't reach TickTick. Retry the change manually.",
      severity: "error",
      retainData: true,
      actions: [{ kind: "retry", title: "Retry", mode: "manual" }],
    });
  });

  it("distinguishes partial, protocol, ambiguous, validation, and unknown failures without unsafe retry actions", () => {
    expect(presentError(new PartialRefreshError("raw partial payload"), "read")).toEqual({
      kind: "partial-refresh",
      title: "Some Tasks Couldn't Be Refreshed",
      message: "Available tasks are shown, but some TickTick data could not be refreshed.",
      severity: "warning",
      retainData: true,
      actions: [{ kind: "refresh", title: "Refresh" }],
    });

    expect(presentError(new ProtocolError("raw unsupported payload"), "mutation")).toEqual({
      kind: "protocol",
      title: "Unsupported TickTick Response",
      message: "TickTick returned data this extension could not safely process.",
      severity: "error",
      retainData: true,
      actions: [{ kind: "refresh", title: "Refresh" }],
    });

    expect(presentError(new AmbiguousMutationError("raw mutation outcome"), "mutation")).toEqual({
      kind: "ambiguous-mutation",
      title: "Task Update Status Unknown",
      message: "TickTick may have applied this change. Refresh before trying again.",
      severity: "warning",
      retainData: true,
      actions: [{ kind: "refresh", title: "Refresh" }],
    });

    expect(presentError(new ValidationError("raw invalid task content"), "mutation")).toEqual({
      kind: "validation",
      title: "Invalid Task Details",
      message: "Review the task details and try again.",
      severity: "error",
      retainData: true,
      actions: [],
    });

    expect(presentError(new Error("raw unknown failure"), "read")).toEqual({
      kind: "unknown",
      title: "Something Went Wrong",
      message: "TickTick couldn't complete the request.",
      severity: "error",
      retainData: true,
      actions: [],
    });
  });

  it("never exposes raw messages, causes, credentials, task content, names, statuses, or response bodies", () => {
    const maliciousMessage =
      "Authorization: Bearer eyJ-secret token=api.secret task content=Medical appointment " +
      "project=Family Secrets task=Private Task status=503 body={private-payload}";
    const maliciousCause = new Error(
      "refresh_token=cause.secret task content=Cause Notes project=Cause Project task=Cause Task status=401 body=cause-body"
    );
    const errors: unknown[] = [
      new AuthenticationError(maliciousMessage, maliciousCause),
      new PermissionError(maliciousMessage, maliciousCause),
      new NotFoundError(maliciousMessage, maliciousCause),
      new RateLimitError(maliciousMessage, 4_000, maliciousCause),
      new NetworkError(maliciousMessage, maliciousCause),
      new PartialRefreshError(maliciousMessage, maliciousCause),
      new ProtocolError(maliciousMessage, maliciousCause),
      new AmbiguousMutationError(maliciousMessage, maliciousCause),
      new ValidationError(maliciousMessage, maliciousCause),
      Object.assign(new Error(maliciousMessage), { cause: maliciousCause }),
    ];
    const forbidden = [
      maliciousMessage,
      "eyJ-secret",
      "api.secret",
      "Medical appointment",
      "Family Secrets",
      "Private Task",
      "private-payload",
      "cause.secret",
      "Cause Notes",
      "Cause Project",
      "Cause Task",
      "cause-body",
      "raw 401",
      "raw 403",
      "raw 404",
      "raw 429",
    ];

    for (const context of ["read", "mutation"] satisfies ErrorPresentationContext[]) {
      for (const error of errors) {
        const serialized = JSON.stringify(presentError(error, context));
        for (const secret of forbidden) expect(serialized).not.toContain(secret);
      }
    }
  });

  it("returns the fixed unknown presentation for hostile or cross-realm-like caught values without throwing", () => {
    const unknownPresentation: ErrorPresentation = {
      kind: "unknown",
      title: "Something Went Wrong",
      message: "TickTick couldn't complete the request.",
      severity: "error",
      retainData: true,
      actions: [],
    };
    const hostileSecret = "Bearer hostile.proxy.token task=Private body=secret-response";
    const prototypeTrap = new Proxy(new Error(hostileSecret), {
      getPrototypeOf() {
        throw new Error(hostileSecret);
      },
    });
    const throwingRetryAfter = new RateLimitError(hostileSecret, 1_000, new Error(hostileSecret));
    Object.defineProperty(throwingRetryAfter, "retryAfterMs", {
      configurable: true,
      get() {
        throw new Error(hostileSecret);
      },
    });
    const coercionTrap = {
      toString() {
        throw new Error(hostileSecret);
      },
      valueOf() {
        throw new Error(hostileSecret);
      },
      [Symbol.toPrimitive]() {
        throw new Error(hostileSecret);
      },
    };
    let arbitraryPropertyWasRead = false;
    const propertyReadTrap = new Proxy(Object.create(null) as object, {
      get() {
        arbitraryPropertyWasRead = true;
        throw new Error(hostileSecret);
      },
      getPrototypeOf() {
        return null;
      },
    });
    const crossRealmLikeAuthentication = Object.assign(Object.create(null) as object, {
      name: "AuthenticationError",
      code: "authentication",
      message: hostileSecret,
      cause: new Error(hostileSecret),
    });
    const crossRealmLikeRateLimit = {
      name: "RateLimitError",
      code: "rate_limit",
      retryable: true,
      retryAfterMs: 1_000,
      message: hostileSecret,
    };

    for (const caughtValue of [
      prototypeTrap,
      throwingRetryAfter,
      coercionTrap,
      propertyReadTrap,
      crossRealmLikeAuthentication,
      crossRealmLikeRateLimit,
    ]) {
      let presentation: ErrorPresentation | undefined;
      expect(() => {
        presentation = presentError(caughtValue, "mutation");
      }).not.toThrow();
      expect(presentation).toEqual(unknownPresentation);
      expect(JSON.stringify(presentation)).not.toContain(hostileSecret);
    }
    expect(arbitraryPropertyWasRead).toBe(false);
  });

  it("returns a closed, UI-agnostic discriminated contract", () => {
    const presentation: ErrorPresentation = presentError(new NetworkError("offline"), "mutation");

    expect(presentation.kind).toBe("network");
    expect(presentation.actions).toEqual([{ kind: "retry", title: "Retry", mode: "manual" }]);
    expect(JSON.stringify(presentation)).not.toContain("automatic");
  });
});
