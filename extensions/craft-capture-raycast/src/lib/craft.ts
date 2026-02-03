import { getPrefs } from "./prefs";

export class HttpError extends Error {
  status: number;
  body?: string;

  constructor(status: number, body?: string) {
    super(`Craft returned ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function sendTask(text: string, targetDate: string, position: "start" | "end"): Promise<void> {
  const prefs = getPrefs();
  if (!prefs.capabilityUrl) {
    throw new Error("Missing Craft capability URL.");
  }
  const endpoint = normalizeCapabilityUrl(prefs.capabilityUrl);

  const payload = {
    blocks: [
      {
        type: "text",
        markdown: `- [ ] ${text}`,
      },
    ],
    position: {
      position,
      date: targetDate,
    },
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await safeReadText(response);
    throw new HttpError(response.status, body);
  }
}

function normalizeCapabilityUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return url;
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }

  if (url.endsWith("/api/v1/blocks")) return url;
  if (url.endsWith("/api/v1")) return `${url}/blocks`;

  if (url.includes("/links/")) {
    if (url.includes("/api/v1/blocks")) return url;
    if (url.includes("/api/v1")) return `${url}/blocks`;
    return `${url}/api/v1/blocks`;
  }

  if (!url.endsWith("/blocks")) {
    return `${url}/blocks`;
  }
  return url;
}

async function safeReadText(response: Response): Promise<string | undefined> {
  try {
    return await response.text();
  } catch {
    return undefined;
  }
}
