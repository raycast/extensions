import { showFailureToast } from "@raycast/utils";
import { getBttErrorDetails } from "./btt-error";

export function showBttFailureToast(error: unknown, title: string) {
  return showFailureToast(error, { title, message: getBttErrorDetails(error) });
}
