import { showToast, Toast } from "@raycast/api";

export const withToast =
  ({
    action,
    onSuccess,
    onFailure,
  }: {
    action: () => Promise<void> | void;
    onSuccess: () => string | [string, string?];
    onFailure: (error: Error) => string | [string, string?];
  }) =>
  async () => {
    try {
      await action();
      if (onSuccess !== undefined) {
        await showToast(Toast.Style.Success, ...toastMsg(onSuccess()));
      }
    } catch (error) {
      if (error instanceof Error) {
        if (onFailure !== undefined) {
          await showToast(Toast.Style.Failure, ...toastMsg(onFailure(error)));
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
