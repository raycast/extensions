export class ShodanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShodanError";
  }
}

export class RateLimitError extends ShodanError {
  public retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export class AuthenticationError extends ShodanError {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class InsufficientCreditsError extends ShodanError {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export function parseShodanError(status: number, data: unknown): ShodanError {
  const message =
    (data as { error?: string })?.error || "Unknown Shodan API error";

  switch (status) {
    case 401:
      return new AuthenticationError(
        "Invalid API key. Please check your API key in extension preferences.",
      );
    case 402:
      return new InsufficientCreditsError(
        "Insufficient credits for this operation. Upgrade your Shodan plan or wait for credits to reset.",
      );
    case 429:
      return new RateLimitError(
        "Rate limit exceeded. Please wait before making another request.",
      );
    default:
      return new ShodanError(message);
  }
}
