import { isJiraErrorResponseBody } from "./validators";

export const handleJiraResponseError = (statusCode: number, body: unknown) => {
  if (!isJiraErrorResponseBody(body)) {
    console.log("Jira response body:", body); // Log unexpected body format
    throw new Error("Unexpected error format received from Jira.");
  }

  const errorBody = body as { message?: string; messages?: string[] };
  let jiraErrorMessage = "";

  // Combine messages from both 'message' and 'messages' fields if present
  jiraErrorMessage += errorBody.messages ? errorBody.messages.join(", ") : "";
  jiraErrorMessage += errorBody.message ? (jiraErrorMessage ? " " : "") + errorBody.message : "";

  const readable = (() => {
    if (jiraErrorMessage.includes("Worklog is null")) {
      return "Worklog field does not exist on the selected issue.";
    }
    switch (statusCode) {
      case 401:
      case 403:
        return "Authentication error: Check your credentials.";
      case 404:
        return "Resource not found: The requested resource was not found.";
      default:
        return jiraErrorMessage || "An error occurred while processing your request.";
    }
  })();

  throw new Error(readable);
};
