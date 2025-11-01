import { showToast, Toast } from "@raycast/api";

export const handleErrors = () => {
  return showToast({
    style: Toast.Style.Failure,
    title: "No text selected",
  });
};
