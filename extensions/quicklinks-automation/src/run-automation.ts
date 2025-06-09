import { showToast, Toast } from "@raycast/api";
import { runAutomation } from "./backend/run_automation";
import { AutomationArguments } from "./types/types";

export default async function Command(props: { arguments: AutomationArguments }) {
  console.log("Running automation with name:", props.arguments.automationName);

  await runAutomation(props.arguments.automationName)
    .then(() => {
      console.log("Automation run successfully");
    })
    .catch((error) => {
      showFailureToast(error, { title: "Error Running Automation" });
    });
}
