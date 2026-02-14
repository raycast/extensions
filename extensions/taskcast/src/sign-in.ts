import { showToast, Toast } from "@raycast/api";
import { getAccessToken } from "./api/auth";
import { getErrorMessage } from "./lib/errors";

export default async function SignIn() {
  try {
    await getAccessToken();
    await showToast({
      style: Toast.Style.Success,
      title: "Signed in to Google Tasks",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Google sign-in failed",
      message: getErrorMessage(error),
    });
    throw error;
  }
}
