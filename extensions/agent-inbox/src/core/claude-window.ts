import { FocusedWindow } from "./focused-window";
import { sameClaudeBridgeId } from "./claude-desktop";

export function claudeDocumentId(raw: string): string | undefined {
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" || url.hostname !== "claude.ai" || url.username || url.password) return undefined;
    return url.pathname.match(/^\/(?:epitaxy|code)\/((?:local_|session_|cse_)[A-Za-z0-9-]{1,128})\/?$/)?.[1];
  } catch {
    return undefined;
  }
}

/** Only the outer Code document may name a session; reject conflicting window identities. */
export function claudeWindowIdentity(window: FocusedWindow): { sessionId: string; title: string } | undefined {
  const sessionId = claudeDocumentId(window.url);
  if (!sessionId) return undefined;
  const other = window.documentUrl ? claudeDocumentId(window.documentUrl) : undefined;
  if (other && other !== sessionId && !sameClaudeBridgeId(other, sessionId)) return undefined;
  const title = window.title
    .replace(/\s+[-–—]\s+Claude(?: Code)?$/, "")
    .trim()
    .replace(/\s+/g, " ");
  return { sessionId, title: /^(?:Claude(?: Code)?|about:blank)?$/i.test(title) ? "" : title };
}
