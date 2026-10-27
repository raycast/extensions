export const handleJiraResponseError = (statusCode: number, body: unknown): never => {
  if (statusCode === 401 || statusCode === 403) {
    throw new Error("Authentication or permission error: Check your credentials and Jira permissions.");
  }
  if (statusCode === 404) throw new Error("Resource not found: The requested Jira resource was not found.");
  if (statusCode === 429) throw new Error("Jira's rate limit was reached. Please try again shortly.");
  const messages: string[] = [];
  if (typeof body === "object" && body !== null) {
    const error = body as Record<string, unknown>;
    for (const key of ["message", "messages", "errorMessages", "errors"]) {
      const value = error[key];
      if (typeof value === "string") messages.push(value);
      else if (Array.isArray(value)) messages.push(...value.filter((item): item is string => typeof item === "string"));
      else if (typeof value === "object" && value !== null) {
        messages.push(...Object.values(value).filter((item): item is string => typeof item === "string"));
      }
    }
  }
  const message = messages.join(" ");
  if (message.includes("Worklog is null")) throw new Error("Worklog field does not exist on the selected issue.");
  throw new Error(message || `Jira request failed (HTTP ${statusCode}).`);
};
