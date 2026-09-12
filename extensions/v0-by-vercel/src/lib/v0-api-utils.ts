export interface V0ErrorResponse {
  error: {
    message: string;
    type: V0ErrorType;
  };
}

export type V0ErrorType =
  | "unauthorized_error"
  | "forbidden_error"
  | "not_found_error"
  | "conflict_error"
  | "payload_too_large_error"
  | "unprocessable_entity_error"
  | "too_many_requests_error"
  | "internal_server_error";

export class V0ApiError extends Error {
  response: V0ErrorResponse;
  status: number;

  constructor(message: string, response: V0ErrorResponse, status: number) {
    super(message);
    this.name = "V0ApiError";
    this.response = response;
    this.status = status;
  }
}

export async function parseV0ApiResponseBody<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorResponse: V0ErrorResponse = await response.json();
    throw new V0ApiError(
      errorResponse.error.message || `Request failed with status ${response.status}`,
      errorResponse,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

interface V0ApiFetcherOptions extends Omit<RequestInit, "body"> {
  body?: Record<string, unknown> | string;
}

export async function v0ApiFetcher<T>(url: string, options?: V0ApiFetcherOptions): Promise<T> {
  const { body, ...restOptions } = options || {};
  const response = await fetch(url, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Raycast-v0-Extension",
      ...(restOptions?.headers || {}),
    },
    body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });

  return parseV0ApiResponseBody(response);
}
