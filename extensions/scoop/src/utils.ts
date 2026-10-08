import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function withToast(
  action: () => Promise<void>,
  options: { loading: string; success: string; failure: string },
) {
  await withToastResult(action, options);
}

export async function withToastResult<T>(
  action: () => Promise<T>,
  options: { loading: string; success: string | ((result: T) => string); failure: string },
) {
  await showToast({
    style: Toast.Style.Animated,
    title: options.loading,
  });

  try {
    const result = await action();
    await showToast({
      style: Toast.Style.Success,
      title: typeof options.success === "function" ? options.success(result) : options.success,
    });
  } catch (error) {
    await showFailureToast(error, { title: options.failure });
  }
}
