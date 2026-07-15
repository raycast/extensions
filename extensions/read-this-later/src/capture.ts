// Capturing article bodies for offline reading.
//
// Mirrors the browser extension's "capture-moment" model (dia-read-later's
// offline.js): run Readability against the live, logged-in DOM at save time.
// That's what gets the full text of a page you're authenticated to — refetching
// the URL later would just return the paywalled stub.
//
// Raycast has no DOM of its own, so the live HTML comes from the Raycast
// browser extension (BrowserExtension.getContent) and is parsed here in Node.
// Without that extension connected there is no capture path at all.

import { BrowserExtension, getPreferenceValues } from "@raycast/api";
import { randomBytes, createCipheriv } from "node:crypto";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import createDOMPurify, { WindowLike } from "dompurify";
import { deriveKey, OfflineArticle } from "./offline";
import { isBoilerplate } from "./boilerplate";
import { OfflineStatus } from "./api";

const BASE_URL = "https://readlater-sync.shearm.workers.dev";

// Frozen, and shared with the other clients: envelope shape and the stub
// threshold both come from dia-read-later/offline.js. Anything shorter than
// this is a paywall stub or a non-article page — store nothing rather than
// cache junk that would render as an empty page on another device.
const PAYLOAD_VERSION = 1;
const MIN_LENGTH = 1500;

export interface Extracted {
  title: string;
  html: string;
  length: number;
  excerpt: string;
  siteName: string;
}

// linkedom rather than jsdom: jsdom resolves ./xhr-sync-worker.js at module
// load, which esbuild cannot bundle — the extension builds fine and then dies
// at runtime with "Cannot find module './xhr-sync-worker.js'". We only ever
// parse a static HTML string, so none of jsdom's networking is wanted anyway.
//
// `pageUrl` is load-bearing: Readability resolves relative hrefs and image
// srcs against the document's baseURI. The browser extension gets that for
// free by running inside the page; parsing detached HTML here does not, so
// without it every relative image breaks on whichever device reads the copy.
export function extract(html: string, pageUrl: string): Extracted | null {
  const { window, document } = parseHTML(html);
  // linkedom has no constructor option for this, unlike jsdom's { url }.
  Object.defineProperty(document, "baseURI", { value: pageUrl });

  // Readability rarely returns null — handed a page with no article it still
  // hands back a tiny result (e.g. just the nav text). Treat this as a guard
  // against outright parse failure; isStub() is what actually rejects junk.
  const article = new Readability(document as never).parse();
  if (!article?.content) return null;

  const purify = createDOMPurify(window as unknown as WindowLike);
  const clean = purify.sanitize(article.content, {
    USE_PROFILES: { html: true },
  });

  return {
    title: article.title || "",
    html: stripBoilerplateHtml(clean),
    length: article.length || (article.textContent || "").length,
    excerpt: article.excerpt || "",
    siteName: article.siteName || "",
  };
}

export function isStub(extracted: Extracted): boolean {
  return extracted.length < MIN_LENGTH;
}

// Drops the publisher furniture Readability keeps — ad slots, "SKIP
// ADVERTISEMENT", section markers. Done here as well as at read time so the
// stored body is clean for the iOS and browser readers too, not just this one.
//
// Only elements whose ENTIRE text is boilerplate are removed, so a paragraph
// that happens to discuss advertising survives. Deepest-first, so an ad slot
// wrapping both "Advertisement" and "SKIP ADVERTISEMENT" has its leaves removed
// even though the wrapper's combined text matches nothing.
export function stripBoilerplateHtml(html: string): string {
  // Must be a complete document: given a bare fragment linkedom silently hands
  // back an empty body rather than erroring, and everything vanishes.
  const { document } = parseHTML(
    `<!DOCTYPE html><html><body>${html}</body></html>`,
  );
  // Array.from, not spread: linkedom's NodeList isn't typed as iterable.
  const elements = Array.from(document.querySelectorAll("body *")).reverse();

  for (const el of elements) {
    if (isBoilerplate(el.textContent ?? "")) el.remove();
  }

  return document.body.innerHTML;
}

export function buildEnvelope(url: string, e: Extracted): OfflineArticle {
  return {
    v: PAYLOAD_VERSION,
    url,
    title: e.title,
    siteName: e.siteName,
    excerpt: e.excerpt,
    length: e.length,
    html: e.html,
    capturedAt: Date.now(),
  };
}

// wire = base64( iv ‖ ciphertext ‖ tag ), random iv per body — never reuse one
// with the same key. Inverse of decryptBody in offline.ts.
export function encryptBody(plaintext: string, syncToken: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(syncToken), iv);
  const ct = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  return Buffer.concat([iv, ct, cipher.getAuthTag()]).toString("base64");
}

async function uploadBody(url: string, wire: string): Promise<boolean> {
  const { syncToken } = getPreferenceValues<Preferences>();
  const response = await fetch(`${BASE_URL}/body`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${syncToken}`,
    },
    body: JSON.stringify({
      url,
      ciphertext: wire,
      meta: { v: PAYLOAD_VERSION },
    }),
  });
  return response.ok;
}

// Reads the live DOM of the tab we just saved. Returns null when the Raycast
// browser extension isn't connected — the only way Raycast can see a page.
async function liveHtml(pageUrl: string): Promise<string | null> {
  try {
    const tabs = await BrowserExtension.getTabs();
    const tab =
      tabs.find((t) => t.url === pageUrl) ?? tabs.find((t) => t.active);
    if (!tab) return null;
    return await BrowserExtension.getContent({ tabId: tab.id, format: "html" });
  } catch {
    return null;
  }
}

// Best-effort: a capture failure must never fail the save itself. The link is
// already stored; the body is a bonus. Returns the status to record on the item.
export async function captureBody(pageUrl: string): Promise<OfflineStatus> {
  const html = await liveHtml(pageUrl);
  if (!html) return "none";

  let extracted: Extracted | null;
  try {
    extracted = extract(html, pageUrl);
  } catch {
    return "unavailable";
  }
  if (!extracted) return "unavailable";
  if (isStub(extracted)) return "unavailable";

  const { syncToken } = getPreferenceValues<Preferences>();
  try {
    const wire = encryptBody(
      JSON.stringify(buildEnvelope(pageUrl, extracted)),
      syncToken,
    );
    return (await uploadBody(pageUrl, wire)) ? "saved" : "none";
  } catch {
    return "none";
  }
}
