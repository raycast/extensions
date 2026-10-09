import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { helloNonce, isValidHello, OUTDATED_APP_MESSAGE, unverifiedMessage } from "../src/api/hello";
import type { Destination } from "../src/api/types";
import { matchDestination } from "../src/lib/match-destination";
import { cleanText, escapeLinkText, escapeMarkdown, markdownURL } from "../src/lib/markdown";

const proof = (token: string, nonce: string) =>
  createHmac("sha256", token).update(`aktar-hello-v1:${nonce}`).digest("hex");

describe("/v1/hello", () => {
  it("makes 43-character base64url nonces, new each time", () => {
    const nonce = helloNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(helloNonce()).not.toBe(nonce);
  });

  it("accepts only Aktar's proof for this token and nonce", () => {
    const nonce = helloNonce();
    expect(isValidHello({ app: "Aktar", proof: proof("token", nonce) }, "token", nonce)).toBe(true);
    expect(isValidHello({ app: "Aktar", proof: proof("other", nonce) }, "token", nonce)).toBe(false);
    expect(isValidHello({ app: "Aktar", proof: proof("token", "another-nonce") }, "token", nonce)).toBe(false);
    expect(isValidHello({ app: "NotAktar", proof: proof("token", nonce) }, "token", nonce)).toBe(false);
    expect(isValidHello({ app: "Aktar", proof: proof("token", nonce).toUpperCase() }, "token", nonce)).toBe(false);
    expect(isValidHello({ app: "Aktar", proof: "00" }, "token", nonce)).toBe(false);
    expect(isValidHello({ app: "Aktar" }, "token", nonce)).toBe(false);
    expect(isValidHello(null, "token", nonce)).toBe(false);
  });

  it("explains a failed check the way the CLI does", () => {
    expect(OUTDATED_APP_MESSAGE).toContain("Update to Aktar for Mac 0.18.0 or Aktar for Windows 0.11.0 or later.");
    expect(unverifiedMessage(47913)).toMatch(/^The app on port 47913 couldn't prove it's Aktar, so the token wasn't sent\./);
  });
});

describe("Markdown", () => {
  it("keeps names from bucket keys as text", () => {
    expect(escapeMarkdown("x ![](https://tracker.example/p.png)")).toBe("x \\!\\[\\]\\(https://tracker.example/p.png\\)");
    expect(escapeMarkdown("a\n# b")).toBe("a \\# b");
    expect(escapeLinkText("[a]\\b")).toBe("\\[a\\]\\\\b");
  });

  it("keeps links whole", () => {
    expect(markdownURL("https://files.example.com/a (1).png")).toBe("https://files.example.com/a%20%281%29.png");
    expect(markdownURL("https://files.example.com/<x>")).toBe("https://files.example.com/%3Cx%3E");
  });

  it("strips control and text-direction characters for AI tools", () => {
    expect(cleanText("a\u001b[2Jb\u202ec")).toBe("a?[2Jb?c");
  });
});

describe("matchDestination", () => {
  const destinations = [
    { id: "D1", name: "Screenshots", bucket: "shots", isDefault: true },
    { id: "D2", name: "Backups", bucket: "private-backups", isDefault: false },
  ] as Destination[];

  it("matches an ID, name or bucket exactly, or the default without a query", () => {
    expect(matchDestination(destinations, "d2").id).toBe("D2");
    expect(matchDestination(destinations, "backups").id).toBe("D2");
    expect(matchDestination(destinations, "private-backups").id).toBe("D2");
    expect(matchDestination(destinations).id).toBe("D1");
  });

  it("refuses partial names and lists the destinations", () => {
    expect(() => matchDestination(destinations, "back")).toThrow(/"Screenshots" \(bucket shots\), "Backups"/);
  });
});
