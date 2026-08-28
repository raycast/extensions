import { closeMainWindow, popToRoot } from "@raycast/api";

type NoViewCommandOptions = {
  popToRoot?: boolean;
};

export async function runNoViewCommand(
  action: () => Promise<void>,
  { popToRoot: shouldPopToRoot = false }: NoViewCommandOptions = {},
): Promise<void> {
  await closeMainWindow();
  await action();

  if (shouldPopToRoot) {
    await popToRoot();
  }
}
