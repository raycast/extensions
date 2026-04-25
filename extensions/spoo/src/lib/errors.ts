import { Toast, showToast } from "@raycast/api";
import { ApiErrorSchema } from "@/schemas/auth";

const FRIENDLY_MESSAGES: Record<string, string> = {
  validation_error: "Check the input and try again.",
  authentication_error: "You need to sign in again.",
  not_found: "Couldn't find that.",
  conflict: "That alias is already taken.",
  forbidden: "You don't have access to this.",
  gone: "This link has expired.",
  blocked: "This URL was flagged as malicious.",
  rate_limit_exceeded: "Slow down — you've hit the rate limit.",
};

const EMOJI: Record<string, string> = {
  gone: "🪦",
  blocked: "⚠️",
  rate_limit_exceeded: "🐌",
  not_found: "🔍",
  conflict: "🔒",
};

export class SpooError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: string;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
    this.name = "SpooError";
  }

  static async fromResponse(response: Response): Promise<SpooError> {
    const code = mapStatusToDefaultCode(response.status);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return new SpooError(
        response.status,
        code,
        response.statusText || "Request failed",
      );
    }
    const parsed = ApiErrorSchema.safeParse(payload);
    if (!parsed.success) {
      return new SpooError(
        response.status,
        code,
        response.statusText || "Request failed",
      );
    }
    return new SpooError(
      response.status,
      parsed.data.code ?? code,
      parsed.data.error,
      parsed.data.field,
    );
  }

  get friendlyMessage(): string {
    const base = FRIENDLY_MESSAGES[this.code];
    return base ? `${base} ${this.message}`.trim() : this.message;
  }

  async toast(): Promise<void> {
    const emoji = EMOJI[this.code] ?? "";
    await showToast({
      style: Toast.Style.Failure,
      title: `${emoji} ${this.friendlyMessage}`.trim(),
      message: this.field ? `Field: ${this.field}` : undefined,
    });
  }
}

function mapStatusToDefaultCode(status: number): string {
  if (status === 400) return "validation_error";
  if (status === 401) return "authentication_error";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 410) return "gone";
  if (status === 429) return "rate_limit_exceeded";
  if (status === 451) return "blocked";
  return "error";
}

export async function reportError(err: unknown): Promise<void> {
  if (err instanceof SpooError) {
    await err.toast();
    return;
  }
  await showToast({
    style: Toast.Style.Failure,
    title: "Something went wrong",
    message: err instanceof Error ? err.message : String(err),
  });
}
