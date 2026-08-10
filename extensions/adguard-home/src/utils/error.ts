import { showToast, Toast } from "@raycast/api";

export async function handleApiError<T>(
  promise: Promise<T>,
  errorConfig: { title: string; message?: string }
): Promise<T | undefined> {
  try {
    return await promise;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: errorConfig.title,
      message: errorConfig.message || String(error),
    });
    return undefined;
  }
}
