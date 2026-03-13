export class AuthenticationError extends Error {
  constructor(
    message = "GitHub authentication failed. Sign out and reconnect your GitHub account.",
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends Error {
  constructor(
    message = "GitHub rate limit reached. Try again in a few minutes.",
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class GitHubRequestError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "GitHubRequestError";
    this.statusCode = statusCode;
  }
}
