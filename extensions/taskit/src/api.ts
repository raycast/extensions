export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Envelope<T> {
  data?: T;
  error?: string;
  code?: string;
}

export interface TaskitApi {
  request<T>(method: string, path: string, body?: unknown): Promise<T>;
}

export interface TaskitClientOptions {
  baseUrl: string;
  getToken: () => string;
  fetchImpl?: typeof fetch;
  refresh?: () => Promise<void>;
}

export class TaskitClient implements TaskitApi {
  constructor(private readonly options: TaskitClientOptions) {}

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      return await this.send(method, path, body);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        this.options.refresh
      ) {
        await this.options.refresh();
        return this.send(method, path, body);
      }
      throw error;
    }
  }

  private async send<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const base = this.options.baseUrl.replace(/\/$/, "");
    const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.options.getToken()}`,
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await (this.options.fetchImpl ?? fetch)(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    let payload: Envelope<T> | undefined;
    if (text) {
      try {
        payload = JSON.parse(text) as Envelope<T>;
      } catch {
        payload = undefined;
      }
    }

    if (!response.ok || payload?.error) {
      throw new ApiError(
        payload?.error || response.statusText || "Request failed",
        response.status,
        payload?.code,
      );
    }

    return payload?.data as T;
  }
}
