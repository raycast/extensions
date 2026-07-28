import { describe, it, expect, beforeEach, vi } from "vitest";
import { rememberPattern, getLearnedPatterns, forgetPattern, forgetAllPatterns } from "../learning";
import { LearnedLinkPattern } from "../types";

const storage = new Map<string, string>();

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: async () => {
      const key = "otp-inbox-learned-link-patterns";
      return storage.get(key) ?? null;
    },
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async () => {
      storage.delete("otp-inbox-learned-link-patterns");
    },
  },
}));

beforeEach(async () => {
  storage.clear();
  await forgetAllPatterns();
});

describe("learned patterns", () => {
  it("remembers a minimal pattern without URLs or tokens", async () => {
    const pattern = await rememberPattern({
      senderAddress: "account@nvidia.com",
      senderRegistrableDomain: "nvidia.com",
      targetHostname: "accounts.nvgs.nvidia.com",
      normalizedCtaText: "verify email address",
      pathSignature: "/api/1/message/verifyemail",
    });

    const patternRecord = pattern as unknown as Record<string, unknown>;
    expect(patternRecord.href).toBeUndefined();
    expect(patternRecord.query).toBeUndefined();
    expect(patternRecord.token).toBeUndefined();
    expect(patternRecord.body).toBeUndefined();
    expect(patternRecord.subject).toBeUndefined();
    expect(patternRecord.messageId).toBeUndefined();
    expect(patternRecord.otp).toBeUndefined();

    expect(pattern.senderAddress).toBe("account@nvidia.com");
    expect(pattern.targetHostname).toBe("accounts.nvgs.nvidia.com");
  });

  it("increments useCount on duplicate remember", async () => {
    const input = {
      senderAddress: "a@example.com",
      senderRegistrableDomain: "example.com",
      targetHostname: "auth.example.com",
      normalizedCtaText: "verify",
      pathSignature: "/verify",
    };
    const first = await rememberPattern(input);
    const second = await rememberPattern(input);
    expect(second.useCount).toBe(first.useCount + 1);
  });

  it("forgets a single pattern", async () => {
    const pattern = await rememberPattern({
      senderAddress: "a@example.com",
      senderRegistrableDomain: "example.com",
      targetHostname: "auth.example.com",
      normalizedCtaText: "verify",
      pathSignature: "/verify",
    });
    await forgetPattern(pattern.id);
    const remaining = await getLearnedPatterns();
    expect(remaining).toHaveLength(0);
  });

  it("prunes expired patterns", async () => {
    const pattern = await rememberPattern({
      senderAddress: "a@example.com",
      senderRegistrableDomain: "example.com",
      targetHostname: "auth.example.com",
      normalizedCtaText: "verify",
      pathSignature: "/verify",
    });

    const aged: LearnedLinkPattern = {
      ...pattern,
      lastUsedAt: new Date(Date.now() - 181 * 24 * 60 * 60 * 1000).toISOString(),
    };
    storage.set("otp-inbox-learned-link-patterns", JSON.stringify([aged]));

    const remaining = await getLearnedPatterns();
    expect(remaining).toHaveLength(0);
  });
});
