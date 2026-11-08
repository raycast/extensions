import { showToast, Toast } from "@raycast/api";
import { toError } from "../services/state-repository";

export async function perform(title: string, operation: () => Promise<void>): Promise<boolean> {
  try {
    await operation();
    return true;
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title, message: toError(error).message });
    return false;
  }
}
