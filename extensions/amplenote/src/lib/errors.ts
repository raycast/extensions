import { showFailureToast } from "@raycast/utils";
import { isConnectionError } from "./mcp";

export function reportError(error: Error): void {
  if (isConnectionError(error)) return;
  void showFailureToast(error, { title: "Amplenote request failed" });
}
