import { Clipboard, Toast } from "@raycast/api";

import { wait } from "@/utils";

type IActionToastOptions = {
  title: string;
  message?: string;
  cancelable: boolean;
};
type NormalActionToastOptions = IActionToastOptions & {
  cancelable: false;
};
type CancelableActionToastOptions = IActionToastOptions & {
  cancelable: true;
};

export function showActionToast(actionOptions: NormalActionToastOptions): undefined;
export function showActionToast(actionOptions: CancelableActionToastOptions): AbortController;
export function showActionToast(actionOptions: IActionToastOptions): AbortController | undefined {
  const options: Toast.Options = {
    style: Toast.Style.Animated,
    title: actionOptions.title,
    message: actionOptions.message,
  };

  let controller: AbortController | undefined;

  if (actionOptions.cancelable) {
    controller = new AbortController();
    options.primaryAction = {
      title: "Cancel",
      onAction: () => {
        controller?.abort();
        toast.hide();
      },
    };
  }

  const toast = new Toast(options);
  toast.show();
  return controller;
}

export async function showFailureToast(title: string, error: Error | string): Promise<void> {
  if (error instanceof Error && error.name == "AbortError") {
    console.log("AbortError");
    return;
  }

  console.log(`${title}: ${error}`);
  const stderr = `${error}`;
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: title,
    message: stderr,
    primaryAction: {
      title: "Copy Error Log",
      onAction: () => {
        Clipboard.copy(stderr);
      },
    },
  };

  const toast = new Toast(options);
  await toast.show();
}

export async function showFailureToastWithTimeout(
  title: string,
  error: Error | string,
  timeout: number = 3000,
): Promise<void> {
  await showFailureToast(title, error);
  await wait(timeout);
}
