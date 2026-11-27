import { LaunchType, launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function openMealsCommand(name: "my-meals" | "plan-my-meals"): Promise<void> {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: `Could not open ${name === "my-meals" ? "My Meals" : "Plan My Meals"}` });
  }
}
