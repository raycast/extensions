import { Clipboard, Toast } from "@raycast/api";

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

export function showActionToast(actionOptions: NormalActionToastOptions): Toast;
export function showActionToast(actionOptions: CancelableActionToastOptions): AbortController;
export function showActionToast(actionOptions: IActionToastOptions): AbortController | Toast {
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
  return controller || toast;
}

export async function showFailureToast(title: string, error: Error): Promise<void> {
  if (error.name == "AbortError") {
    console.log("AbortError");
    return;
  }

  console.log(`${title}: ${error}`);
  let stderr = `${error}`;
  if (error.message.includes("Invalid image format")) {
    stderr = "Only JPEG, PNG, WebP, TIFF, and HEIC/HEIF are supported.";
  }

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
