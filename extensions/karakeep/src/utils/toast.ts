import { Clipboard, showToast, Toast } from "@raycast/api";

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function runWithToast<T>(options: {
  loading: { title: string; message?: string };
  success: { title: string; message?: string };
  failure: { title: string; message?: string };
  action: () => Promise<T>;
}): Promise<T | undefined> {
  const toast = await showToast({
    title: options.loading.title,
    message: options.loading.message,
    style: Toast.Style.Animated,
  });

  try {
    const result = await options.action();
    toast.style = Toast.Style.Success;
    toast.title = options.success.title;
    toast.message = options.success.message;
    return result;
  } catch (error) {
    const errorMessage = options.failure.message ?? toErrorMessage(error);
    toast.style = Toast.Style.Failure;
    toast.title = options.failure.title;
    toast.message = errorMessage;
    toast.primaryAction = {
      title: "Copy Error",
      onAction: () => Clipboard.copy(errorMessage),
    };
    return undefined;
  }
}
