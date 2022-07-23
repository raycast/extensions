import { showToast, Toast } from "@raycast/api";

export default class ToastableError extends Error {
  constructor(public readonly title: string, public readonly toastBody?: string) {
    super(title);
  }
}

export function showErrorToast(error: unknown): Promise<Toast> {
  if (error instanceof ToastableError) {
    return showToast({
      style: Toast.Style.Failure,
      title: error.title,
      message: error.toastBody,
    });
  } else if (error instanceof Error) {
    return showToast({
      style: Toast.Style.Failure,
      title: error.message,
    });
  } else {
    return showToast({
      style: Toast.Style.Failure,
      title: String(error),
    });
  }
}
