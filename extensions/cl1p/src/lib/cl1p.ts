export type SaveResult =
  { ok: true; url: string } | { ok: false; message: string };

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
      body: content,
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      ok: false,
      message: body || `HTTP ${response.status} — title may already be in use`,
    };
  }

  return {
    ok: true,
    url: `https://cl1p.net/${encodeURIComponent(cleanTitle)}`,
  };
}
