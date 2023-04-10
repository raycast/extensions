import { showToast, ToastStyle } from '@raycast/api';

export const withToast =
  ({
    action,
    onSuccess,
    onFailure,
  }: {
    action: () => Promise<void>;
    onSuccess: () => string | [string, string?];
    onFailure: (error: Error) => string | [string, string?];
  }) =>
  async () => {
    try {
      await action();
      if (onSuccess !== undefined) {
        await showToast(ToastStyle.Success, ...toastMsg(onSuccess()));
      }
    } catch (error) {
      if (error instanceof Error) {
        if (onFailure !== undefined) {
          await showToast(ToastStyle.Failure, ...toastMsg(onFailure(error)));
        }
      }
    }
  };

const toastMsg = (input: string | [string, string?]): [string, string?] => {
  if (Array.isArray(input)) {
    return input;
  }
  return [input];
};
