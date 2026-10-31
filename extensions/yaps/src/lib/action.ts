import { showFailureToast } from "@raycast/utils";

export async function runAction(failureTitle: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    await showFailureToast(error, { title: failureTitle });
  }
}
