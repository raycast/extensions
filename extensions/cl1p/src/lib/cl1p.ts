export type SaveResult =
  { ok: true; url: string } | { ok: false; message: string };

// cl1p.net serves cl1ps created via the API as raw text/html (unlike the
// web form, which always displays content inside its own <textarea>), so
// plain "\n" collapses like normal HTML whitespace unless converted to <br>.
function toHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>\n");
}

export async function saveToCl1p(
  title: string,
  content: string,
  apiToken: string,
): Promise<SaveResult> {
  const cleanTitle = title.trim().replace(/^\/+/, "");

  const response = await fetch(
    `https://api.cl1p.net/${encodeURIComponent(cleanTitle)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        cl1papitoken: apiToken,
      },
      body: toHtml(content),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      message: body || `HTTP ${response.status} — title may already be in use`,
    };
  }

  return { ok: true, url: `https://cl1p.net/${cleanTitle}` };
}
