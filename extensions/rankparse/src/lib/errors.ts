import { showFailureToast } from "@raycast/utils";
import { AuthError, InsufficientCreditsError, NotFoundError, RateLimitError } from "rankparse";

export function handleApiError(error: unknown): void {
  if (error instanceof AuthError) {
    void showFailureToast(error, { title: "Invalid API key — check RankParse extension preferences" });
  } else if (error instanceof InsufficientCreditsError) {
    void showFailureToast(error, { title: "Out of credits — top up at rankparse.com/dashboard" });
  } else if (error instanceof RateLimitError) {
    void showFailureToast(error, { title: "Rate limited — try again shortly" });
  } else if (error instanceof NotFoundError) {
    void showFailureToast(error, { title: "Not found" });
  } else {
    void showFailureToast(error, { title: "RankParse request failed" });
  }
}
