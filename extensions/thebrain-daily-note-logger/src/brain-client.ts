export class BrainError extends Error {}

interface Thought {
  id: string;
  name: string;
}

interface AppState {
  currentBrainId?: string;
  currentBrainName?: string;
}

export class BrainClient {
  brainId: string | null = null;
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T | undefined> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new BrainError(`HTTP ${res.status} — ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : undefined;
  }

  private requireBrainId(): string {
    if (!this.brainId)
      throw new BrainError("brainId not set — call getState() first");
    return this.brainId;
  }

  async getState(): Promise<AppState | undefined> {
    return this.request<AppState>("GET", "/api/app/state");
  }

  async getThoughtByName(name: string): Promise<Thought | null> {
    const params = new URLSearchParams({ nameExact: name });
    try {
      return (
        (await this.request<Thought>(
          "GET",
          `/api/thoughts/${this.requireBrainId()}?${params}`,
        )) ?? null
      );
    } catch (e) {
      if (e instanceof BrainError && e.message.includes("HTTP 404"))
        return null;
      throw e;
    }
  }

  async getChildren(thoughtId: string): Promise<Thought[]> {
    const result = await this.request<{ children?: Thought[] }>(
      "GET",
      `/api/thoughts/${this.requireBrainId()}/${thoughtId}/graph`,
    );
    return result?.children ?? [];
  }

  async getNote(thoughtId: string): Promise<string> {
    try {
      const result = await this.request<{ noteContent?: string }>(
        "GET",
        `/api/notes/${this.requireBrainId()}/${thoughtId}`,
      );
      return result?.noteContent ?? "";
    } catch (e) {
      if (e instanceof BrainError && e.message.includes("HTTP 404")) return "";
      throw e;
    }
  }

  async saveNote(thoughtId: string, html: string): Promise<void> {
    await this.request<void>(
      "POST",
      `/api/notes/${this.requireBrainId()}/${thoughtId}`,
      {
        noteContent: html,
      },
    );
  }
}

export function buildUpdatedNote(
  html: string,
  timestamp: string,
  text: string,
): string {
  const entry = `<h4>${timestamp} ${text}</h4>`;
  if (!html || !/<\/body>/i.test(html)) {
    return `<html><body>${entry}</body></html>`;
  }
  return html.replace(/<\/body>/i, `${entry}</body>`);
}
