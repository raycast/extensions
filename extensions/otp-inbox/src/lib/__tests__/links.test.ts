import { describe, it, expect } from "vitest";
import { extractLinkCandidates, selectVerificationLink, getAmbiguousLinks, normalizeCtaText } from "../links";
import { Anchor } from "../html";

function makeAnchor(text: string, href: string): Anchor {
  return { text, href, index: 0 };
}

const nvidiaContext = {
  senderRegistrableDomain: "nvidia.com",
  senderAddress: "account@nvidia.com",
  learnedPatterns: [],
};

describe("normalizeCtaText", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeCtaText("  Verify   Email  ")).toBe("verify email");
  });
});

describe("extractLinkCandidates", () => {
  it("selects a strong same-domain CTA", () => {
    const anchors = [
      makeAnchor("Verify Email Address", "https://accounts.nvgs.nvidia.com/api/1/message/VerifyEmail?q=token"),
    ];
    const candidates = extractLinkCandidates(anchors, nvidiaContext);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].isSameRegistrableDomain).toBe(true);
    expect(candidates[0].hasPositiveIntent).toBe(true);
    expect(candidates[0].hasNegativeIntent).toBe(false);
  });

  it("rejects footer privacy links", () => {
    const anchors = [makeAnchor("Privacy Policy", "https://www.nvidia.com/en-us/about-nvidia/privacy-policy/")];
    const candidates = extractLinkCandidates(anchors, nvidiaContext);
    expect(candidates[0].hasNegativeIntent).toBe(true);
  });

  it("rejects cross-domain spoof", () => {
    const anchors = [makeAnchor("Verify Email Address", "https://nvidia-login.example.com/verify")];
    const candidates = extractLinkCandidates(anchors, nvidiaContext);
    expect(candidates[0].rejectionReasons).toContain("domain_mismatch");
  });

  it("rejects evil lookalike", () => {
    const anchors = [makeAnchor("Verify", "https://evilnvidia.com/verify")];
    const candidates = extractLinkCandidates(anchors, nvidiaContext);
    expect(candidates[0].rejectionReasons).toContain("domain_mismatch");
  });

  it("rejects HTTP", () => {
    const anchors = [makeAnchor("Verify", "http://account.nvidia.com/verify")];
    const candidates = extractLinkCandidates(anchors, nvidiaContext);
    expect(candidates).toHaveLength(0);
  });

  it("rejects unsafe readable cross-domain redirect", () => {
    const anchors = [makeAnchor("Verify", "https://accounts.nvgs.nvidia.com/verify?continue=https://evil.example/...")];
    const candidates = extractLinkCandidates(anchors, nvidiaContext);
    expect(candidates[0].hasUnsafeReadableRedirect).toBe(true);
  });

  it("keeps opaque same-domain token", () => {
    const anchors = [
      makeAnchor("Verify Email", "https://accounts.nvgs.nvidia.com/verify?q=synthetic-signed-opaque-value"),
    ];
    const candidates = extractLinkCandidates(anchors, nvidiaContext);
    expect(candidates[0].rejectionReasons).not.toContain("domain_mismatch");
    expect(candidates[0].hasUnsafeReadableRedirect).toBe(false);
  });

  it("handles co.uk public suffix correctly", () => {
    const anchors = [makeAnchor("Confirm your email", "https://login.auth.example.co.uk/verify")];
    const context = {
      senderRegistrableDomain: "example.co.uk",
      senderAddress: "no-reply@auth.example.co.uk",
      learnedPatterns: [],
    };
    const candidates = extractLinkCandidates(anchors, context);
    expect(candidates[0].isSameRegistrableDomain).toBe(true);
  });

  it("does not auto-select weak click-here without path intent", () => {
    const anchors = [makeAnchor("Click here", "https://accounts.nvgs.nvidia.com/some/path")];
    const candidates = extractLinkCandidates(anchors, nvidiaContext);
    const selected = selectVerificationLink(candidates);
    expect(selected).toBeUndefined();
  });
});

describe("selectVerificationLink", () => {
  it("selects a decisively strong CTA over footer links", () => {
    const anchors = [
      makeAnchor("Verify Email Address", "https://accounts.nvgs.nvidia.com/api/1/message/VerifyEmail?q=token"),
      makeAnchor("Privacy Policy", "https://www.nvidia.com/en-us/about-nvidia/privacy-policy/"),
      makeAnchor("Contact", "https://www.nvidia.com/en-us/contact/"),
    ];
    const candidates = extractLinkCandidates(anchors, nvidiaContext);
    const selected = selectVerificationLink(candidates);
    expect(selected).toBeDefined();
    expect(selected!.link.hostname).toBe("accounts.nvgs.nvidia.com");
    expect(selected!.link.pathSignature).toBe("/api/1/message/verifyemail");
  });

  it("returns ambiguous when two equally strong CTAs exist", () => {
    const anchors = [
      makeAnchor("Verify Email Address", "https://accounts.nvgs.nvidia.com/api/1/message/VerifyEmail"),
      makeAnchor("Verify Email Address", "https://accounts.nvgs.nvidia.com/api/2/message/VerifyEmail"),
    ];
    const candidates = extractLinkCandidates(anchors, nvidiaContext);
    const selected = selectVerificationLink(candidates);
    expect(selected).toBeUndefined();
    expect(getAmbiguousLinks(candidates).length).toBe(2);
  });
});
