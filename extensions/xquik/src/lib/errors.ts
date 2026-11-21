export type ErrorKind =
  "auth" | "credits" | "paused" | "notFound" | "invalid" | "rateLimited" | "upstream" | "network" | "unexpected";

export type ErrorFix = "preferences" | "site" | "retry";

type ErrorDetails = { title: string; hint: string; fix: ErrorFix };

const ERROR_DETAILS: Record<ErrorKind, ErrorDetails> = {
  auth: { title: "Invalid API Key", hint: "Check the key in the extension preferences.", fix: "preferences" },
  credits: { title: "Out of Credits", hint: "Add credits on Xquik to keep going.", fix: "site" },
  paused: { title: "Access Blocked", hint: "Check this API key on Xquik.", fix: "site" },
  notFound: { title: "Not Found", hint: "Check the username or post and try again.", fix: "retry" },
  invalid: { title: "Invalid Request", hint: "Check what you entered and try again.", fix: "retry" },
  rateLimited: { title: "Too Many Requests", hint: "Wait a moment and try again.", fix: "retry" },
  upstream: { title: "Request Failed", hint: "X or Xquik could not answer. Try again soon.", fix: "retry" },
  network: { title: "No Connection", hint: "Check your network and try again.", fix: "retry" },
  unexpected: { title: "Unexpected Response", hint: "Xquik sent a reply this version cannot read.", fix: "retry" },
};

const STATUS_KINDS: Record<number, ErrorKind> = {
  400: "invalid",
  401: "auth",
  402: "credits",
  403: "paused",
  404: "notFound",
  429: "rateLimited",
};

export function kindForStatus(status: number): ErrorKind {
  return STATUS_KINDS[status] ?? "upstream";
}

export class XquikError extends Error {
  readonly kind: ErrorKind;

  constructor(kind: ErrorKind, message?: string) {
    super(message || ERROR_DETAILS[kind].hint);
    this.name = "XquikError";
    this.kind = kind;
  }
}

export function describeError(error: Error): ErrorDetails {
  if (error instanceof XquikError) return { ...ERROR_DETAILS[error.kind], hint: error.message };
  return ERROR_DETAILS.unexpected;
}
