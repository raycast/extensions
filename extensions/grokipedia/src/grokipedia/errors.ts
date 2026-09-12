/**
 * Grokipedia error classes (JS)
 */

export class GrokipediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrokipediaError";
  }
}

export class GrokipediaAPIError extends GrokipediaError {
  statusCode: number | null;
  responseBody: string | null;

  constructor(message: string, statusCode: number | null = null, responseBody: string | null = null) {
    super(message);
    this.name = "GrokipediaAPIError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class GrokipediaBadRequestError extends GrokipediaAPIError {
  constructor(message: string, statusCode: number, responseBody: string | null) {
    super(message, statusCode, responseBody);
    this.name = "GrokipediaBadRequestError";
  }
}

export class GrokipediaNotFoundError extends GrokipediaAPIError {
  constructor(message: string, statusCode: number, responseBody: string | null) {
    super(message, statusCode, responseBody);
    this.name = "GrokipediaNotFoundError";
  }
}

export class GrokipediaRateLimitError extends GrokipediaAPIError {
  constructor(message: string, statusCode: number, responseBody: string | null) {
    super(message, statusCode, responseBody);
    this.name = "GrokipediaRateLimitError";
  }
}

export class GrokipediaServerError extends GrokipediaAPIError {
  constructor(message: string, statusCode: number, responseBody: string | null) {
    super(message, statusCode, responseBody);
    this.name = "GrokipediaServerError";
  }
}

export class GrokipediaNetworkError extends GrokipediaError {
  constructor(message: string) {
    super(message);
    this.name = "GrokipediaNetworkError";
  }
}

export class GrokipediaValidationError extends GrokipediaError {
  constructor(message: string) {
    super(message);
    this.name = "GrokipediaValidationError";
  }
}
