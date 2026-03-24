export class JenkinsApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "JenkinsApiError";
  }
}

export function assertOk(response: { ok: boolean; status: number }): void {
  if (response.ok) return;
  switch (response.status) {
    case 401:
    case 403:
      throw new JenkinsApiError(
        response.status,
        "Authentication failed — check your API token in preferences",
      );
    case 404:
      throw new JenkinsApiError(404, "Job not found");
    default:
      throw new JenkinsApiError(
        response.status,
        `Jenkins returned ${response.status}`,
      );
  }
}

export function handleFetchError(error: unknown): string {
  if (error instanceof JenkinsApiError) return error.message;
  if (error instanceof TypeError)
    return "Cannot connect to Jenkins — check the URL in preferences";
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
