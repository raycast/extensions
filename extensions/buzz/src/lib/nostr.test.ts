import { describe, it, expect, vi } from "vitest";
import * as nip19 from "nostr-tools/nip19";
import { parseSecretKey, getPublicKeyHex, signEvent, buildNip98Header } from "./nostr";
import { verifyEvent } from "nostr-tools/pure";
import { createHash } from "node:crypto";

// A valid secp256k1 secret key (1), used as a deterministic test fixture.
const HEX_KEY = "0000000000000000000000000000000000000000000000000000000000000001";

describe("parseSecretKey", () => {
  it("accepts a 64-character hex key", () => {
    const sk = parseSecretKey(HEX_KEY);
    expect(sk).toBeInstanceOf(Uint8Array);
    expect(sk.length).toBe(32);
  });

  it("accepts an nsec1 key and round-trips to the same bytes as its hex", () => {
    const fromHex = parseSecretKey(HEX_KEY);
    // nip19.nsecEncode is used only here, in the test, to construct a valid
    // nsec input for the same key so we can assert the decode round-trips.
    const nsec = nip19.nsecEncode(fromHex);
    const fromNsec = parseSecretKey(nsec);
    expect(Buffer.from(fromNsec).toString("hex")).toBe(HEX_KEY);
  });

  it("trims surrounding whitespace", () => {
    expect(parseSecretKey(`  ${HEX_KEY}  `).length).toBe(32);
  });

  it("rejects an empty string", () => {
    expect(() => parseSecretKey("")).toThrow();
  });

  it("rejects a too-short hex string", () => {
    expect(() => parseSecretKey("abc123")).toThrow();
  });

  it("rejects a missing value rather than throwing on undefined", () => {
    // Raycast hands back undefined for a preference that was never filled in.
    expect(() => parseSecretKey(undefined as unknown as string)).toThrow(/64-character hex string or an nsec1/);
  });

  it("rejects a 64-character string that is not hex", () => {
    expect(() => parseSecretKey("z".repeat(64))).toThrow();
  });

  it("rejects a malformed nsec", () => {
    expect(() => parseSecretKey("nsec1notarealkey")).toThrow();
  });

  it("rejects a bech32 string that decodes to something other than a private key", async () => {
    // The nsec1 prefix always decodes to type "nsec" today, so the guard is
    // only reachable by forcing nip19 to report another type. It exists because
    // a decoder change must not be allowed to hand back a non-key silently.
    vi.resetModules();
    vi.doMock("nostr-tools/nip19", () => ({ decode: () => ({ type: "npub", data: "not-a-secret-key" }) }));
    const { parseSecretKey: parseWithStubbedDecoder } = await import("./nostr");
    expect(() => parseWithStubbedDecoder("nsec1looksrightbutisnot")).toThrow(/expected an nsec private key/);
    vi.doUnmock("nostr-tools/nip19");
    vi.resetModules();
  });

  it("never includes the key material in the error message", () => {
    try {
      parseSecretKey("deadbeef");
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as Error).message).not.toContain("deadbeef");
    }
  });
});

describe("getPublicKeyHex", () => {
  it("derives a 64-character hex pubkey", () => {
    const pk = getPublicKeyHex(parseSecretKey(HEX_KEY));
    expect(pk).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("signEvent", () => {
  const SK = parseSecretKey("0000000000000000000000000000000000000000000000000000000000000001");

  it("produces a fully populated, verifiable event", () => {
    const ev = signEvent({ kind: 9, created_at: 1700000000, tags: [["h", "chan"]], content: "hi" }, SK);
    expect(ev.id).toMatch(/^[0-9a-f]{64}$/);
    expect(ev.pubkey).toMatch(/^[0-9a-f]{64}$/);
    expect(ev.sig).toMatch(/^[0-9a-f]{128}$/);
    expect(verifyEvent(ev)).toBe(true);
  });

  it("computes a deterministic id for identical event fields", () => {
    const template = { kind: 9, created_at: 1700000000, tags: [["h", "chan"]], content: "hi" };
    const a = signEvent(template, SK);
    const b = signEvent(template, SK);
    expect(a.id).toBe(b.id);
  });

  it("preserves tags and content", () => {
    const ev = signEvent(
      {
        kind: 7,
        created_at: 1700000000,
        tags: [
          ["e", "m1"],
          ["h", "chan"],
        ],
        content: "+",
      },
      SK,
    );
    expect(ev.kind).toBe(7);
    expect(ev.content).toBe("+");
    expect(ev.tags).toContainEqual(["e", "m1"]);
    expect(ev.tags).toContainEqual(["h", "chan"]);
  });
});

describe("buildNip98Header", () => {
  const SK = parseSecretKey("0000000000000000000000000000000000000000000000000000000000000001");
  const URL = "https://relay.example.com/query";

  function decode(header: string) {
    expect(header.startsWith("Nostr ")).toBe(true);
    const b64 = header.slice("Nostr ".length);
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  }
  const tagValue = (ev: { tags: string[][] }, name: string) => ev.tags.find((t) => t[0] === name)?.[1];

  it("uses kind 27235 and a valid signature", () => {
    const ev = decode(buildNip98Header(URL, "POST", "[]", SK));
    expect(ev.kind).toBe(27235);
    expect(verifyEvent(ev)).toBe(true);
  });

  it("uses the single-letter u tag holding the exact URL, and never a url tag", () => {
    const ev = decode(buildNip98Header(URL, "POST", "[]", SK));
    expect(tagValue(ev, "u")).toBe(URL);
    expect(ev.tags.find((t: string[]) => t[0] === "url")).toBeUndefined();
  });

  it("sets method and a payload equal to sha256hex(body)", () => {
    const body = JSON.stringify([{ kinds: [9] }]);
    const ev = decode(buildNip98Header(URL, "POST", body, SK));
    expect(tagValue(ev, "method")).toBe("POST");
    const expected = createHash("sha256").update(body, "utf8").digest("hex");
    expect(tagValue(ev, "payload")).toBe(expected);
  });

  it("includes a nonce tag", () => {
    const ev = decode(buildNip98Header(URL, "POST", "[]", SK));
    expect(tagValue(ev, "nonce")).toBeTruthy();
  });

  it("the Authorization base64 losslessly round-trips the signed event, and the payload hashes the body's UTF-8 bytes", () => {
    const body = JSON.stringify({ content: "party time \u{1F389}" });
    const header = buildNip98Header(URL, "POST", body, SK);

    // Decode the header and verify the payload hashes the exact UTF-8 bytes of the body.
    expect(header.startsWith("Nostr ")).toBe(true);
    const b64 = header.slice("Nostr ".length);
    const ev = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));

    const expected = createHash("sha256").update(body, "utf8").digest("hex");
    expect(tagValue(ev, "payload")).toBe(expected);

    // Prove lossless round-trip: re-encode the parsed event and assert it matches.
    const reencoded = Buffer.from(JSON.stringify(ev), "utf8").toString("base64");
    expect(reencoded).toBe(b64);

    // Verify the decoded event is intact and validly signed.
    expect(verifyEvent(ev)).toBe(true);
  });
});
