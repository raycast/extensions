import { Toast, showToast } from "@raycast/api";
import Style = Toast.Style;

export const showError = async (message: string, title = "failed") => {
  return showToast({
    style: Style.Failure,
    message,
    title,
  });
};

export const showLoading = async (message: string, title = "loading") => {
  return showToast({
    style: Style.Animated,
    message,
    title,
  });
};

export const showSuccess = async (message: string, title = "done") => {
  return showToast({
    style: Style.Success,
    message,
    title,
  });
};
