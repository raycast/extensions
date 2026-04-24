export class GitHubRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "GitHubRequestError";
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof GitHubRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
