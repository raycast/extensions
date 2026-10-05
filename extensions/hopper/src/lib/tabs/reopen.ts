// PURE: how sources describe a closed tab to open again (TabSource.reopenTarget), for Recently Closed (history.ts).

import type { ReopenTarget } from "./model";

/** A web page to reopen, or undefined for blank, internal, and non-web pages. */
export function webReopenTarget(url: string | undefined): ReopenTarget | undefined {
  return url && /^https?:\/\//.test(url) ? { kind: "url", target: url } : undefined;
}

/** A file to reopen from a window's document URL; not folders (Terminal reports its working directory). */
export function fileReopenTarget(document: string | undefined): ReopenTarget | undefined {
  if (!document?.startsWith("file://") || document.endsWith("/")) return undefined;
  try {
    return { kind: "file", target: decodeURIComponent(new URL(document).pathname) };
  } catch {
    return undefined;
  }
}
