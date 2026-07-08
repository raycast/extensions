import { type Response } from "node-fetch";

import { getRateLimitErrorMessage } from "../helpers/errors";

const HTML_RESPONSE_ERROR_MESSAGE = "Jira returned an HTML page instead of JSON. Please reconnect Jira and try again.";
const AUTH_ERROR_MESSAGE =
  "Your Jira session has expired or was revoked. Please reconnect Jira in Raycast extension preferences and try again.";

export class JiraApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

export class JiraAuthError extends JiraApiError {
  constructor(message = AUTH_ERROR_MESSAGE, status?: number) {
    super(message, status);
    this.name = "JiraAuthError";
  }
}

export async function parseJiraResponse<T>(response: Response): Promise<T | null> {
  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    await throwOnErrorResponse(response);
  }

  return parseJiraJsonResponse<T>(response);
}

export async function parseJiraJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  const contentType = response.headers.get("content-type");

  if (isHtmlResponse(contentType, body)) {
    throw response.status === 401 || response.status === 403
      ? new JiraAuthError(undefined, response.status)
      : new JiraApiError(HTML_RESPONSE_ERROR_MESSAGE, response.status);
  }

  if (body.trim().length === 0) {
    throw new JiraApiError(`Jira returned an empty response with status ${response.status}.`, response.status);
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new JiraApiError(`Jira returned an invalid JSON response with status ${response.status}.`, response.status);
  }
}

async function throwOnErrorResponse(response: Response): Promise<never> {
  if (response.status === 429) {
    throw new JiraApiError(getRateLimitErrorMessage(response.headers.get("Retry-After")), response.status);
  }

  if (response.status === 401 || response.status === 403) {
    throw new JiraAuthError(undefined, response.status);
  }

  try {
    const result = await parseJiraJsonResponse<unknown>(response);
    throw new JiraApiError(JSON.stringify(result), response.status);
  } catch (error) {
    if (error instanceof JiraApiError) {
      throw error;
    }

    throw new JiraApiError(`Jira request failed with status ${response.status}.`, response.status);
  }
}

function isHtmlResponse(contentType: string | null, body: string): boolean {
  const normalizedContentType = contentType?.toLowerCase() ?? "";
  const trimmedBody = body.trimStart().toLowerCase();

  return (
    normalizedContentType.includes("text/html") ||
    trimmedBody.startsWith("<!doctype html") ||
    trimmedBody.startsWith("<html")
  );
}
