import { showToast, Toast } from "@raycast/api";
import Style = Toast.Style;

export default function showError(e: Error) {
  showToast(Style.Failure, e.message).finally(() => console.log(e));
}
