import { showToast, Toast } from "@raycast/api";

export const withToast =
  ({
    action,
    onStart,
    onSuccess,
    onFailure,
  }: {
    action: () => Promise<void>;
    onStart: () => string | [string, string?];
    onSuccess: () => string | [string, string?];
    onFailure: (error: Error) => string | [string, string?];
  }) =>
  async () => {
    const start = toastMsg(onStart());
    const toast = await showToast(Toast.Style.Animated, start.title, start.message);

    try {
      await action();
      const success = toastMsg(onSuccess());
      toast.style = Toast.Style.Success;
      toast.title = success.title;
      toast.message = success.message;
    } catch (error) {
      if (error instanceof Error) {
        toast.style = Toast.Style.Failure;
        const failure = toastMsg(onFailure(error));
        toast.title = failure.title;
        toast.message = failure.message;
      }
    }
  };

function toastMsg(input: string | [string, string?]) {
  if (Array.isArray(input)) {
    return { title: input[0], message: input[1] };
  }
  return { title: input, message: undefined };
}
