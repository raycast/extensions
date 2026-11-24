import { describe, expect, it } from "vitest";
import type { ShortenResult } from "../src/lib/api";
import {
  CREDENTIALS_BODY,
  CREDENTIALS_TITLE,
  escapeMarkdown,
  failureMarkdown,
  formatExpiry,
  N1,
  N2,
  N3,
  N4,
  N5,
  N6,
  N7,
  NO_URL_BODY,
  NO_URL_TITLE,
  noUrlMarkdown,
  NOTHING_SENT,
  QR_ALT,
  QR_FAILED,
  renderQrDataUrl,
  retryAfterText,
  successMarkdown,
} from "../src/lib/view";

type Failure = Extract<ShortenResult, { ok: false }>;

const failure = (over: Partial<Failure>): Failure => ({
  ok: false,
  kind: "other",
  title: "Title",
  status: 400,
  ...over,
});

/** The unescape a markdown renderer applies to what `escapeMarkdown` wrote. */
const unescape = (s: string) => s.replace(/\\([\\`*_[\]()<>!#|])/g, "$1");

// The constant texts carry URLs of Linkonda's own and a literal `http://`; hostile text is what must hold no bare http.
const CONSTANT_TEXTS = [NO_URL_BODY, N1, N2, N4, N5];
const withoutConstants = (markdown: string) => CONSTANT_TEXTS.reduce((m, text) => m.split(text).join(""), markdown);

describe("retryAfterText", () => {
  it("retry text matches the MCP server's thresholds", () => {
    expect(retryAfterText("1")).toBe("Try again in 1 second.");
    expect(retryAfterText("0")).toBe("Try again in 0 seconds.");
    expect(retryAfterText("90")).toBe("Try again in 90 seconds.");
    expect(retryAfterText("91")).toBe("Try again in about 2 minutes.");
    expect(retryAfterText("5400")).toBe("Try again in about 90 minutes.");
    expect(retryAfterText("5401")).toBe("Try again in about 2 hours.");
    for (const odd of [undefined, null, "", "0.4", "soon", "-3", " 5"]) {
      expect(retryAfterText(odd)).toBe("Try again in a moment.");
    }
  });
});

describe("failureMarkdown", () => {
  it("a DESTINATION_BLOCKED message survives escaping character for character, Google's attribution included", () => {
    const message =
      "This destination is suspected of phishing. Learn more: https://support.google.com/webmasters/answer/9044101 — Advisory provided by Google (https://developers.google.com/safe-browsing). Lists can be wrong!";
    const md = failureMarkdown(
      failure({ kind: "blocked", title: "Linkonda refused this destination", code: "DESTINATION_BLOCKED", message }),
    );
    expect(md).toContain(escapeMarkdown(message));
    expect(unescape(escapeMarkdown(message))).toBe(message);
    // A literal expectation, not the function against itself: the parentheses around Google's link are escaped.
    expect(escapeMarkdown(message)).toContain(
      "Advisory provided by Google \\(https://developers.google.com/safe-browsing\\)",
    );
    expect(escapeMarkdown(message)).toContain("can be wrong\\!");
    for (const ch of "\\`*_[]()<>!#|") expect(escapeMarkdown(`a${ch}b`)).toBe(`a\\${ch}b`);
    expect(unescape(escapeMarkdown("a\\b`c*d_e[f]g(h)i<j>k!l#m|n"))).toBe("a\\b`c*d_e[f]g(h)i<j>k!l#m|n");
  });

  it("failure markdown carries title, message, next step and code, and cuts the message at 500 characters", () => {
    const md = failureMarkdown(
      failure({
        kind: "blocked",
        title: "Linkonda refused this destination",
        code: "DESTINATION_BLOCKED",
        status: 400,
        message: "x".repeat(600),
      }),
    );
    expect(md).toBe(
      [
        "## Linkonda refused this destination",
        "x".repeat(500),
        N3,
        "Error code: `DESTINATION_BLOCKED` · HTTP `400`",
      ].join("\n\n"),
    );
    const rate = failureMarkdown(
      failure({
        kind: "rate-limited",
        title: "Too many requests",
        code: "RATE_LIMITED",
        status: 429,
        message: "slow",
        retryAfter: "120",
      }),
    );
    expect(rate).toBe(
      ["## Too many requests", "slow", "Try again in about 2 minutes.", "Error code: `RATE_LIMITED` · HTTP `429`"].join(
        "\n\n",
      ),
    );
    // Cut by characters, not by UTF-16 halves.
    expect(failureMarkdown(failure({ message: "😀".repeat(501) }))).toContain("😀".repeat(500) + "\n");
    // Texts for the other next steps.
    expect(failureMarkdown(failure({ kind: "network", title: "Couldn't reach Linkonda", status: undefined }))).toBe(
      `## Couldn't reach Linkonda\n\n${N7}`,
    );
    expect(failureMarkdown(failure({ kind: "unavailable", title: "T", status: 503 }))).toBe(
      `## T\n\nHTTP 503\n\n${N6}`,
    );
    expect(
      failureMarkdown(failure({ kind: "quota", anonymous: true, code: "QUOTA_EXCEEDED", status: 429, message: "m" })),
    ).toContain(N1);
    expect(failureMarkdown(failure({ kind: "key", code: "INVALID_API_KEY", status: 401, message: "m" }))).toContain(N4);
    expect(failureMarkdown(failure({ kind: "key", code: "EMAIL_NOT_VERIFIED", status: 403, message: "m" }))).toContain(
      N5,
    );
  });

  it("failure and no-URL markdown have no unescaped ![, ]( or <", () => {
    const hostile =
      "![x](http://evil.test/p.png) [a](https://evil.test) <img src=x onerror=1> <a href=http://evil.test>z</a>";
    const outputs = [
      failureMarkdown(failure({ message: hostile, code: "X_CODE" })),
      failureMarkdown(
        failure({ kind: "quota", anonymous: false, message: hostile, code: "QUOTA_EXCEEDED", status: 429 }),
      ),
      failureMarkdown(failure({ code: "`![x](http://evil.test)`" })),
      noUrlMarkdown("none"),
      noUrlMarkdown("credentials"),
    ];
    for (const md of outputs) {
      const text = withoutConstants(md);
      expect(text).not.toMatch(/(?<!\\)!\[/);
      expect(text).not.toMatch(/(?<!\\)\]\(/);
      expect(text).not.toMatch(/(?<!\\)</);
    }
    // A code that isn't a plain upper-case code is not shown at all.
    expect(failureMarkdown(failure({ code: "`![x](http://evil.test)`" }))).not.toContain("evil");
  });
});

describe("noUrlMarkdown", () => {
  it("says nothing was sent", () => {
    expect(noUrlMarkdown("none")).toBe(`## ${NO_URL_TITLE}\n\n${NO_URL_BODY}\n\n${NOTHING_SENT}`);
    expect(noUrlMarkdown("credentials")).toBe(`## ${CREDENTIALS_TITLE}\n\n${CREDENTIALS_BODY} ${NOTHING_SENT}`);
  });
});

describe("successMarkdown", () => {
  it("success markdown is exactly the constant alt text and the data:image/png URL with its size suffix", async () => {
    const qr = await renderQrDataUrl("https://lnko.eu/x7Kp2");
    expect(qr).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/);
    expect(successMarkdown(qr)).toBe(`![${QR_ALT}](${qr}?raycast-width=256&raycast-height=256)`);
    expect(QR_ALT).toBe("QR code of the short link");
  });

  it("the QR failure text replaces the image, and says nothing about the clipboard if the copy failed", () => {
    expect(successMarkdown(null, false)).toBe("");
    expect(successMarkdown(null)).toBe("The short link is on your clipboard. The QR code couldn't be made.");
    expect(QR_FAILED).toBe(successMarkdown(null));
  });
});

describe("formatExpiry", () => {
  it("expiry reads Never for null", () => {
    expect(formatExpiry(null)).toBe("Never");
  });

  it("formats a date as Mar 1, 2027", () => {
    expect(formatExpiry("2027-03-01T12:00:00.000Z", "UTC")).toBe("Mar 1, 2027");
    expect(formatExpiry("not a date")).toBe("not a date");
  });
});
