import { getPreferenceValues, showToast, Toast } from "@raycast/api";

const isValidToken = () => {
  const token = String(getPreferenceValues().accessToken);
  if (token.length !== 24) {
    showToast({
      style: Toast.Style.Failure,
      title: "Invalid token detected. Please set one in the settings.",
    });
    throw new Error("Invalid token length detected");
  } else {
    return true;
  }
};

export default isValidToken;
