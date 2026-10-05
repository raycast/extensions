import { Toast, closeMainWindow, showToast, type LaunchProps } from "@raycast/api";

import { registeredVMs, resolveVMQuery } from "./registered-vms";
import { errorMessage, openOutcomeTitle } from "./presentation";

type OpenCommandProps = LaunchProps<{
  arguments: {
    query?: string;
  };
}>;

export default async function OpenCommand(props: OpenCommandProps): Promise<void> {
  const query = firstNonEmpty(props.arguments.query, props.fallbackText);
  if (!query) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Virtual Machine Required",
      message: "Enter a virtual machine name or UUID.",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Finding Virtual Machine…",
    message: query,
  });

  try {
    const vms = await registeredVMs.snapshot();
    const vm = resolveVMQuery(vms, query);
    toast.title = `Opening ${vm.name}…`;
    toast.message = undefined;

    await closeMainWindow();
    const outcome = await registeredVMs.openOrSwitch(vm.id);
    toast.style = Toast.Style.Success;
    toast.title = openOutcomeTitle(outcome);
  } catch (error) {
    console.error(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Could Not Open Virtual Machine";
    toast.message = errorMessage(error);
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}
