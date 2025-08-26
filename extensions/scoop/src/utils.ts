import { Toast, showToast } from "@raycast/api";

export async function withToast(
  action: () => Promise<void>,
  options: { loading: string; success: string; failure: string },
) {
  await showToast({
    style: Toast.Style.Animated,
    title: options.loading,
  });

  try {
    await action();
    await showToast({
      style: Toast.Style.Success,
      title: options.success,
    });
  } catch (error) {
    await showFailureToast(error, { title: options.failure });
  }
}
