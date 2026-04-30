export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API Error ${status}: ${body}`);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(body: string) {
    super(401, body);
    this.name = "UnauthorizedError";
  }
}

export interface ErrorDetails {
  errorCode?: string;
  existingId?: string;
}

export class BadRequestError extends ApiError {
  public readonly errorDetails?: ErrorDetails;

  constructor(body: string) {
    super(400, body);
    this.name = "BadRequestError";

    try {
      const parsed = JSON.parse(body);
      if (parsed.errorCode) {
        this.errorDetails = {
          errorCode: parsed.errorCode,
          existingId: parsed.existingId,
        };
      }
    } catch {
      // Body is not JSON, leave errorDetails undefined
    }
  }

  isLearningItemConflict(): boolean {
    return this.errorDetails?.errorCode === "LEARNING_ITEM_ALREADY_EXISTS" && !!this.errorDetails?.existingId;
  }
}

const REQUEST_TIMEOUT_MS = 30_000;

export class RestClient {
  constructor(
    private readonly baseUrl: string,
    private readonly tokenProvider: () => Promise<string | null>,
  ) {}

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.tokenProvider();
    if (!token) {
      throw new UnauthorizedError("No authentication token available");
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401) {
        throw new UnauthorizedError(body);
      }
      if (response.status === 400) {
        throw new BadRequestError(body);
      }
      throw new ApiError(response.status, body);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("Content-Type");
    if (contentType?.includes("application/json")) {
      return response.json();
    }

    return undefined as T;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: await this.getHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: await this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers: await this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "PATCH",
      headers: await this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const url = new URL(path, this.baseUrl);

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: await this.getHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    return this.handleResponse<T>(response);
  }
}
