import { showToast, Toast } from '@raycast/api';

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
    const { title, message } = toastMsg(onStart());
    const toast = await showToast(Toast.Style.Animated, title, message);

    try {
      await action();
      const { title, message } = toastMsg(onSuccess());
      toast.style = Toast.Style.Success;
      toast.title = title;
      toast.message = message;
    } catch (error) {
      if (error instanceof Error) {
        toast.style = Toast.Style.Failure;
        const { title, message } = toastMsg(onFailure(error));
        toast.title = title;
        toast.message = message;
      }
    }
  };

function toastMsg(input: string | [string, string?]) {
  if (Array.isArray(input)) {
    return { title: input[0], message: input[1] };
  }
  return { title: input, message: undefined };
}
