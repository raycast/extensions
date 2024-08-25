import { LocalStorage, showToast, Toast } from "@raycast/api";

export const shouldPingIssue = async () => {
  try {
    await LocalStorage.setItem("shouldPingLinearIssue", "true");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to set shouldPingIssue",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export const stopPingingIssue = async () => {
  try {
    await LocalStorage.removeItem("shouldPingLinearIssue");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to set stopPingingIssue",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getPingStatus = async () => {
  try {
    const shouldPingValue = await LocalStorage.getItem("shouldPingLinearIssue");
    return shouldPingValue === "true";
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to get ping status",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};
