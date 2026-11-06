import { LaunchProps, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { executeRoutine } from "./lib/automation";
import { getRoutines } from "./lib/routine-store";
import { describeRokuError } from "./lib/roku";

export default async function Command({ arguments: args }: LaunchProps<{ arguments: Arguments.RunRokuRoutine }>) {
  const controller = new AbortController();
  try {
    const routine = (await getRoutines()).find((item) => item.id === args.routineId);
    if (!routine) throw new Error("This routine no longer exists. Create a new Quicklink from Roku Routines.");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Running ${routine.name}`,
      primaryAction: { title: "Cancel", onAction: () => controller.abort() },
    });
    const result = await executeRoutine(routine, {
      signal: controller.signal,
      onProgress: (step) => {
        toast.message = `Step ${step.stepNumber} of ${step.totalSteps}`;
      },
    });
    toast.style = result.status === "failed" ? Toast.Style.Failure : Toast.Style.Success;
    toast.title = result.status === "completed" ? `${routine.name} completed` : `${routine.name} ${result.status}`;
    toast.message = result.error ?? `${result.completedSteps} of ${result.totalSteps} steps completed`;
    if (result.status === "completed") await showHUD(`${routine.name} completed`);
  } catch (error) {
    await showFailureToast(describeRokuError(error), { title: "Routine stopped" });
  }
}
