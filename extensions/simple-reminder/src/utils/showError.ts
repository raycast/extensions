import { showToast, Toast } from "@raycast/api";
import Style = Toast.Style;

export async function showError(
  title: string,
  description = "Oops. This is truly unexpected, please contact us directly for us to solve the issue!",
) {
  await showToast(Style.Failure, title, description);
}
