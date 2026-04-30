import { confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface WithSkillActionOptions<T> {
  confirm?: {
    title: string;
    message: string;
    primaryAction?: { title: string; style: Alert.ActionStyle };
  };
  toast: {
    animatedTitle: string;
    successTitle: string;
    successMessage?: string;
    failureTitle: string;
  };
  operation: () => Promise<T>;
  onSuccess?: (result: T) => void | Promise<void>;
}

export async function withSkillAction<T = void>({
  confirm: confirmOpts,
  toast: toastOpts,
  operation,
  onSuccess,
}: WithSkillActionOptions<T>): Promise<void> {
  if (confirmOpts) {
    const confirmed = await confirmAlert({
      title: confirmOpts.title,
      message: confirmOpts.message,
      primaryAction: confirmOpts.primaryAction ?? { title: "Confirm", style: Alert.ActionStyle.Default },
    });
    if (!confirmed) return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: toastOpts.animatedTitle,
  });

  let result: T;
  try {
    result = await operation();
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: toastOpts.failureTitle });
    return;
  }

  toast.style = Toast.Style.Success;
  toast.title = toastOpts.successTitle;
  if (toastOpts.successMessage) toast.message = toastOpts.successMessage;

  if (onSuccess) {
    try {
      await onSuccess(result);
    } catch (error) {
      console.error("[skills] onSuccess handler failed after a successful operation:", error);
    }
  }
}
