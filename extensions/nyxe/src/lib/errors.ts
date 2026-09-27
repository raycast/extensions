/**
 * What to tell the user when a call fails — pure, so it is tested without
 * Raycast. `./raycast.ts` turns this into a toast.
 */
import { NyxeApiError } from "./api";

export interface ErrorDescription {
  title: string;
  message?: string;
  /** Offer to open Settings → API tokens in Nyxe (a token problem). */
  offerTokens: boolean;
}

export function describeError(err: unknown): ErrorDescription {
  if (err instanceof NyxeApiError) {
    switch (err.code) {
      case "unauthorized":
        return {
          title: "Your Nyxe token isn't working",
          message: "It may have expired or been revoked. Create a new one in Nyxe and paste it into the preferences.",
          offerTokens: true,
        };
      case "insufficient_scope":
        return {
          title: `Token is missing the ${err.scope ?? "required"} scope`,
          message: "Create a token with that access in Nyxe → Settings → API tokens.",
          offerTokens: true,
        };
      case "rate_limited":
        return {
          title: "Slow down",
          message:
            err.message && !/too many requests/i.test(err.message)
              ? err.message
              : err.retryAfterSeconds
                ? `Try again in ${err.retryAfterSeconds}s.`
                : "Try again in a moment.",
          offerTokens: false,
        };
      case "network_error":
        return { title: "Couldn't reach Nyxe", message: err.message, offerTokens: false };
      case "mailbox_unavailable":
        return { title: "Your mailbox isn't reachable", message: err.message, offerTokens: false };
      default:
        return { title: "Nyxe couldn't do that", message: err.message, offerTokens: false };
    }
  }
  return {
    title: "Something went wrong",
    message: err instanceof Error ? err.message : String(err),
    offerTokens: false,
  };
}
