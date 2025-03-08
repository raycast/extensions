import { showToast, Toast, Clipboard } from "@raycast/api";
import { generateXkcdPassword } from "./generatePassword";

export default async function Command() {
  const password = generateXkcdPassword();

  try {
    await Clipboard.copy(password);
    await showToast({
      style: Toast.Style.Success,
      title: "Password Generated & Copied",
      message: password,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate password",
      message: String(error),
    });
  }
}
