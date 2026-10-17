import { LaunchProps, showHUD, open, showToast, Toast } from "@raycast/api";
import { checkForScoreInstallation } from "./utils/utils";
import { FORSCORE_ACTIONS } from "./constants/constants";

export default async function Command(props: LaunchProps<{ arguments: Arguments.GoToPage }>) {
  if (!(await checkForScoreInstallation())) {
    return;
  }

  const pageNum = parseInt(props.arguments.page, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid page number",
      message: "Please enter a positive number",
    });
    return;
  }

  open(FORSCORE_ACTIONS.GO_TO_PAGE(pageNum));
  await showHUD(`Opened to page ${pageNum}`);
}
