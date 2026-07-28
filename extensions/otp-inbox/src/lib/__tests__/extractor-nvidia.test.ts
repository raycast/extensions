import { describe, it, expect } from "vitest";
import { extractVerificationMethods } from "../extractor";
import { Email } from "../types";

function b64(str: string): string {
  return Buffer.from(str).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const nvidiaHtml = `<html>
  <head>
    <style>
      .button { font-size: 14px; font-family: NVIDIA, Arial; font-weight: 700; }
      @font-face { font-family: NVIDIA; src: url(https://assets.example/font.woff2); }
    </style>
  </head>
  <body>
    <p>Hello,</p>
    <p>Your account just logged in using a Mac device we haven't seen you use recently.</p>
    <p>Click the link below to verify this was you and continue to NVIDIA.</p>

    <a href="https://accounts.nvgs.nvidia.com/api/1/message/VerifyEmail?q=synthetic-opaque-token">
      Verify Email Address
    </a>

    <p><strong>Location:</strong> Birmingham</p>

    <footer>
      <a href="https://www.nvidia.com/en-us/about-nvidia/privacy-policy/">Privacy Policy</a>
      <a href="https://www.nvidia.com/en-us/about-nvidia/privacy-center/">Manage My Privacy</a>
      <a href="https://www.nvidia.com/en-us/contact/">Contact</a>
    </footer>
  </body>
</html>`;

function makeEmail(html: string): Email {
  return {
    internalDate: Date.now().toString(),
    payload: {
      headers: [
        { name: "From", value: "NVIDIA Accounts <account@nvidia.com>" },
        { name: "Subject", value: "Authenticate Your Email Address" },
      ],
      mimeType: "text/html",
      body: { data: b64(html) },
    },
  };
}

describe("NVIDIA regression", () => {
  it("selects verification CTA and excludes CSS from OTP", async () => {
    const result = await extractVerificationMethods(makeEmail(nvidiaHtml));

    expect(result.emailText).toContain("Verify Email Address");
    expect(result.emailText).not.toContain("font-size");
    expect(result.emailText).not.toContain("font-family");
    expect(result.emailText).not.toContain("font-weight");
    expect(result.emailText).not.toContain("@font-face");
    expect(result.emailText).not.toContain("assets.example/font.woff2");

    expect(result.otp).toBeUndefined();

    expect(result.link).toBeDefined();
    expect(result.link!.hostname).toBe("accounts.nvgs.nvidia.com");
    expect(result.link!.pathSignature).toBe("/api/1/message/verifyemail");
    expect(result.link!.normalizedCtaText).toBe("verify email address");

    expect(result.ambiguousLinks).toHaveLength(0);
  });

  it("does not expose the opaque query token", async () => {
    const result = await extractVerificationMethods(makeEmail(nvidiaHtml));
    expect(result.link!.href).toContain("q=synthetic-opaque-token");
    expect(result.emailText).not.toContain("synthetic-opaque-token");
    expect(result.emailText).not.toContain("?q=");
  });

  it("rejects footer links", async () => {
    const result = await extractVerificationMethods(makeEmail(nvidiaHtml));
    const privacy = result.ambiguousLinks.find((l) => l.visibleText.toLowerCase().includes("privacy"));
    const contact = result.ambiguousLinks.find((l) => l.visibleText.toLowerCase().includes("contact"));
    expect(privacy).toBeUndefined();
    expect(contact).toBeUndefined();
  });
});

describe("generalized link tests", () => {
  it("selects a generic transactional CTA", async () => {
    const html = `<a href="https://auth.service.example.com/confirm">Confirm your email</a>`;
    const email = makeEmail(html);
    email.payload.headers = [{ name: "From", value: "security@service.example.com" }];
    const result = await extractVerificationMethods(email);
    expect(result.link).toBeDefined();
    expect(result.link!.hostname).toBe("auth.service.example.com");
  });

  it("handles both OTP and link in one email", async () => {
    const html = `Your code is 987654. <a href="https://auth.service.example.com/verify">Confirm your email</a>`;
    const email = makeEmail(html);
    email.payload.headers = [{ name: "From", value: "security@service.example.com" }];
    const result = await extractVerificationMethods(email);
    expect(result.otp).toBe("987654");
    expect(result.link).toBeDefined();
  });

  it("rejects footer-only emails", async () => {
    const html = `<footer><a href="https://example.com/privacy">Privacy</a><a href="https://example.com/unsubscribe">Unsubscribe</a></footer>`;
    const email = makeEmail(html);
    email.payload.headers = [{ name: "From", value: "no-reply@example.com" }];
    const result = await extractVerificationMethods(email);
    expect(result.link).toBeUndefined();
    expect(result.ambiguousLinks).toHaveLength(0);
  });
});
