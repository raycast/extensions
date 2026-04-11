import type { TwentyConfig } from "./preferences";

export class TwentyApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: string,
  ) {
    super(message);
    this.name = "TwentyApiError";
  }
}

export const createTwentyClient = (config: TwentyConfig) => {
  const requestJson = async <T>(path: string, init: RequestInit = {}): Promise<T | undefined> => {
    const normalizedPath = path.replace(/^\/+/, "");
    const url = new URL(normalizedPath, `${config.restBaseUrl}/`).toString();
    const headers = new Headers(init.headers);

    headers.set("Authorization", config.authHeader);
    headers.set("Content-Type", "application/json");
    const mergedHeaders = Object.fromEntries(headers.entries());

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: mergedHeaders,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new TwentyApiError("Twenty API request failed (transport error)", 0, `${url}: ${details}`);
    }

    if (!response.ok) {
      const details = await response.text();
      throw new TwentyApiError(`Twenty API request failed (${response.status})`, response.status, details);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  };

  return {
    requestJson,
  };
};

export type TwentyClient = ReturnType<typeof createTwentyClient>;
