import { showFailureToast } from "@raycast/utils";

export async function perform(title: string, operation: () => Promise<void>): Promise<boolean> {
  try {
    await operation();
    return true;
  } catch (error) {
    await showFailureToast(error, { title });
    return false;
  }
}
