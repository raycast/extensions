import { showToast, Toast } from "@raycast/api";
import { Effect } from "effect";

export class FeedbackService extends Effect.Service<FeedbackService>()("FeedbackService", {
  succeed: {
    showToast: (toast: Toast.Options) => Effect.promise(() => showToast(toast)),
  },
}) {}
