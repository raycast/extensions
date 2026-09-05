import { describe, it, expect } from "vitest";
import { extractBodies } from "../mime";
import { EmailPayload } from "../types";

function b64url(str: string): string {
  return Buffer.from(str).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("extractBodies", () => {
  it("prefers text/plain and retains text/html", () => {
    const payload: EmailPayload = {
      headers: [],
      mimeType: "multipart/alternative",
      parts: [
        {
          headers: [],
          mimeType: "text/plain",
          body: { data: b64url("Your code is 123456") },
        },
        {
          headers: [],
          mimeType: "text/html",
          body: { data: b64url("<p>Your code is <b>123456</b></p>") },
        },
      ],
    };
    const result = extractBodies(payload);
    expect(result.plainText).toContain("Your code is 123456");
    expect(result.htmlText).toContain("<p>Your code is <b>123456</b></p>");
  });

  it("derives visible text from HTML when plain text is absent", () => {
    const payload: EmailPayload = {
      headers: [],
      mimeType: "text/html",
      body: { data: b64url("<p>Click Verify Email Address</p>") },
    };
    const result = extractBodies(payload);
    expect(result.plainText).toBe("");
    expect(result.htmlText).toContain("<p>Click Verify Email Address</p>");
  });

  it("ignores attachment parts", () => {
    const payload: EmailPayload = {
      headers: [],
      mimeType: "multipart/mixed",
      parts: [
        {
          headers: [{ name: "Content-Disposition", value: "attachment; filename=doc.pdf" }],
          mimeType: "application/pdf",
          body: { data: b64url("PDFCONTENT") },
        },
        {
          headers: [],
          mimeType: "text/plain",
          body: { data: b64url("Your code is 654321") },
        },
      ],
    };
    const result = extractBodies(payload);
    expect(result.plainText).toBe("Your code is 654321");
  });

  it("handles malformed base64url safely", () => {
    const payload: EmailPayload = {
      headers: [],
      mimeType: "text/plain",
      body: { data: "!!!not-base64!!!" },
    };
    expect(() => extractBodies(payload)).not.toThrow();
    expect(extractBodies(payload).plainText).toBe("");
  });

  it("handles nested multipart", () => {
    const payload: EmailPayload = {
      headers: [],
      mimeType: "multipart/mixed",
      parts: [
        {
          headers: [],
          mimeType: "multipart/alternative",
          parts: [
            {
              headers: [],
              mimeType: "text/plain",
              body: { data: b64url("Plain body") },
            },
            {
              headers: [],
              mimeType: "text/html",
              body: { data: b64url("<p>HTML body</p>") },
            },
          ],
        },
      ],
    };
    const result = extractBodies(payload);
    expect(result.plainText).toBe("Plain body");
    expect(result.htmlText).toContain("HTML body");
  });
});
