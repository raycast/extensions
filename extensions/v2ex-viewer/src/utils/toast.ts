import { Toast, showToast } from "@raycast/api";

export const showLoadingToast = async (options?: Partial<Omit<Toast.Options, "style">>) => {
  await showToast({
    style: Toast.Style.Animated,
    title: "Loading",
    ...options,
  });
};
export const showSuccessfulToast = async (options?: Partial<Omit<Toast.Options, "style">>) => {
  await showToast({
    style: Toast.Style.Success,
    title: "Successful",
    ...options,
  });
};
export const showFailedToast = async (options?: Partial<Omit<Toast.Options, "style">>) => {
  await showToast({
    style: Toast.Style.Failure,
    title: "Failed",
    ...options,
  });
};
