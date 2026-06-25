import { Toast, showToast } from "@raycast/api";
import { errorMessage } from "./container";

type MessageInput = string | { title: string; message?: string };

interface WithToastOptions {
  action: () => Promise<void>;
  onStart?: MessageInput;
  onSuccess?: MessageInput;
  onFailure?: MessageInput | ((error: unknown) => MessageInput);
}

function normalize(input: MessageInput): { title: string; message?: string } {
  return typeof input === "string" ? { title: input } : input;
}

/**
 * Wraps an async mutation with animated → success/failure toast transitions.
 * The returned function never rejects (failures are surfaced as a toast), so
 * callers can safely chain `.then(revalidate)` to refresh after any outcome.
 */
export function withToast(options: WithToastOptions): () => Promise<void> {
  return async () => {
    const start = options.onStart ? normalize(options.onStart) : { title: "Working…" };
    const toast = await showToast({ style: Toast.Style.Animated, title: start.title, message: start.message });
    try {
      await options.action();
      if (options.onSuccess) {
        const success = normalize(options.onSuccess);
        toast.style = Toast.Style.Success;
        toast.title = success.title;
        toast.message = success.message;
      } else {
        await toast.hide();
      }
    } catch (error) {
      const failure = options.onFailure
        ? normalize(typeof options.onFailure === "function" ? options.onFailure(error) : options.onFailure)
        : { title: "Operation failed", message: errorMessage(error) };
      toast.style = Toast.Style.Failure;
      toast.title = failure.title;
      toast.message = failure.message;
    }
  };
}
