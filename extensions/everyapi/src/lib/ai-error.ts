export interface AIErrorExplanation {
  title: string;
  message: string;
}

function errorStatus(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return undefined;
  }
  return typeof value.status === "number" ? value.status : undefined;
}

export function explainAIError(value: unknown): AIErrorExplanation {
  switch (errorStatus(value)) {
    case 401:
      return {
        title: "Session Expired",
        message: "Sign in to EveryAPI again, then retry the request.",
      };
    case 403:
      return {
        title: "Request Blocked",
        message:
          "EveryAPI or the selected provider blocked this request. Try another model; if every model fails, check Service Status.",
      };
    case 429:
      return {
        title: "Too Many Requests",
        message:
          "The account or provider is rate limited. Wait briefly, then retry.",
      };
    case 502:
    case 503:
    case 504:
      return {
        title: "Model Unavailable",
        message:
          "The selected provider is temporarily unavailable. Try another model or check Service Status.",
      };
    default:
      return {
        title: "Request Failed",
        message:
          value instanceof Error
            ? value.message
            : "The request could not be completed.",
      };
  }
}

export function shouldRetryWithoutUsage(value: unknown): boolean {
  const status = errorStatus(value);
  return status === 400 || status === 422;
}

export function isModelNotFound(value: unknown): boolean {
  if (
    errorStatus(value) !== 404 ||
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }
  const message = "message" in value ? value.message : undefined;
  return typeof message === "string" && /model\s+not\s+found/i.test(message);
}
