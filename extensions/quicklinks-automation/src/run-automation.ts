import { showToast, Toast } from "@raycast/api";
import { runAutomation } from "./backend/run_automation";
import { AutomationArguments } from "./types/types";
import { showFailureToast } from "@raycast/utils";

export default async function Command(props: { arguments: AutomationArguments }) {
  await runAutomation(props.arguments.automationName)
    .then(() => {
      showToast({
        style: Toast.Style.Success,
        title: "Automation ran successfully!",
      });
    })
    .catch((error) => {
      showFailureToast(error, { title: "Error running automation" });
    });
}
