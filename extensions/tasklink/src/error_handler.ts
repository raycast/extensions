import { showToast, Toast } from "@raycast/api";

export const handleErrors = (e: Error) => {
  return showToast({
    style: Toast.Style.Failure,
    title: e.message || "No text selected",
  });
};
