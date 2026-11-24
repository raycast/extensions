import type { IncomingHttpHeaders } from "node:http";

function headerValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value.join("; ");
  }
  return value ?? "";
}

/**
 * Slack's login / workspace-gate pages, as returned when a file download is
 * unauthorized or missing `files:read`. Real HTML attachments rarely match.
 */
export function looksLikeSlackSignInHtml(html: string): boolean {
  const sample = html.slice(0, 8192);
  return (
    /sign in to (?:your workspace|slack)/i.test(sample) ||
    /you need to sign in to (?:your )?slack/i.test(sample) ||
    /<title>\s*slack\s*<\/title>/i.test(sample) ||
    /<title>\s*sign in\b[^<]*slack\s*<\/title>/i.test(sample) ||
    /name=["']signin["']/i.test(sample) ||
    /id=["'](?:page_)?signin(?:_form)?["']/i.test(sample) ||
    /data-qa=["']signin/i.test(sample)
  );
}

/**
 * Slack answers unauthorized/insufficient-scope file downloads with an HTML
 * sign-in page (HTTP 200) rather than the file bytes. Real HTML attachments are
 * also `text/html`, so callers must distinguish the two: an `attachment`
 * Content-Disposition is a file, and HTML without Slack sign-in markers is too.
 */
export function isSlackAuthenticationResponse(headers: IncomingHttpHeaders, bodyPreview: string): boolean {
  const contentType = headerValue(headers["content-type"]).toLowerCase();
  if (!contentType.includes("text/html")) {
    return false;
  }

  const disposition = headerValue(headers["content-disposition"]);
  if (/\battachment\b/i.test(disposition)) {
    return false;
  }

  return looksLikeSlackSignInHtml(bodyPreview);
}
