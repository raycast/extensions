import { describe, expect, it, vi } from "vitest";
import type { ScreenReference } from "../lib/types";

vi.mock("@raycast/api", () => ({
  Action: {},
  ActionPanel: {},
  Clipboard: {},
  environment: { supportPath: "/tmp/mobbin-reference-actions" },
  Icon: {},
  Toast: { Style: {} },
  showToast: vi.fn(),
}));
vi.mock("@raycast/utils", () => ({ showFailureToast: vi.fn() }));

import { htmlSnippet, markdownSnippet } from "../components/ReferenceActions";

const reference: ScreenReference = {
  kind: "screen",
  id: "screen-1",
  title: "Login",
  appName: `Example [App] "Plus" & Co`,
  platform: "ios",
  source: "api",
  mobbinUrl: "https://mobbin.com/screen-1",
  image: { url: "https://example.com/image.webp?a=1&b=2" },
};

describe("reference snippets", () => {
  it("escapes Markdown alt text", () => {
    expect(markdownSnippet(reference)).toContain(
      'Example \\[App\\] "Plus" & Co',
    );
  });

  it("escapes HTML attributes", () => {
    expect(htmlSnippet(reference)).toBe(
      '<img src="https://example.com/image.webp?a=1&amp;b=2" alt="Example [App] &quot;Plus&quot; &amp; Co" />',
    );
  });

  it("omits temporary URL snippets for inline-only images", () => {
    expect(
      markdownSnippet({
        ...reference,
        image: { dataUrl: "data:image/png;base64,AA==" },
      }),
    ).toBeUndefined();
  });
});
