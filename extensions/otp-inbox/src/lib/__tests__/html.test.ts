import { describe, it, expect } from "vitest";
import { sanitizeHtml, getVisibleText } from "../html";

describe("sanitizeHtml", () => {
  it("removes CSS and preserves CTA text", () => {
    const html = `
      <html>
        <head>
          <style>.x { font-size: 14px; font-family: NVIDIA, Arial; font-weight: 700; }</style>
        </head>
        <body>
          <p>Verify Email Address</p>
        </body>
      </html>
    `;
    const result = sanitizeHtml(html);
    expect(result.text).toContain("Verify Email Address");
    expect(result.text).not.toContain("font-size");
    expect(result.text).not.toContain("font-family");
    expect(result.text).not.toContain("font-weight");
  });

  it("extracts anchor href and visible text", () => {
    const html = `<a href="https://example.com/verify">Verify Email</a>`;
    const result = sanitizeHtml(html);
    expect(result.anchors).toHaveLength(1);
    expect(result.anchors[0].href).toBe("https://example.com/verify");
    expect(result.anchors[0].text).toBe("Verify Email");
  });

  it("does not include script or style content", () => {
    const html = `<style>body{color:red}</style><script>alert(1)</script><p>Hello</p>`;
    const result = sanitizeHtml(html);
    expect(result.text).toBe("Hello");
  });

  it("decodes HTML entities", () => {
    const html = `<p>Hello &amp; welcome</p>`;
    const result = sanitizeHtml(html);
    expect(result.text).toContain("Hello & welcome");
  });
});

describe("getVisibleText", () => {
  it("returns plain visible text", () => {
    expect(getVisibleText("<p>Hello world</p>")).toBe("Hello world");
  });
});
