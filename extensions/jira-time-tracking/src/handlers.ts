import { isJiraErrorResponseBody } from "./validators";

export const handleJiraResponseError = (statusCode: number, body: unknown) => {
  let jiraErrorMessage;
  const isJiraError = isJiraErrorResponseBody(body);
  const hasMessages = isJiraError && "messages" in body && Array.isArray(body.messages);
  const hasMessage = isJiraError && "message" in body;
  if (hasMessages) jiraErrorMessage = body.messages?.join("");
  if (hasMessage) jiraErrorMessage = body.message;

  const readable = (() => {
    if (jiraErrorMessage?.includes("Worklog is null")) return "Worklog field does not exist on the selected issue.";
    if (statusCode === 401 || statusCode === 404) return "There was an a problem authenticating with your credentials.";
    return "An Error Occurred";
  })();

  throw new Error(readable);
};
