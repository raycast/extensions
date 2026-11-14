import { showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { control } from "./control";
import { Operation } from "./response";

export async function runCommand(operation: Operation) {
  try {
    const state = await control(operation);
    const wording = state.defaultEnabled ? "enabled" : "disabled";
    await showHUD(
      `Cotypist default completions ${wording}${state.changed ? "" : " (already set)"}`,
    );
    if (state.warnings.length)
      await showToast({
        style: Toast.Style.Failure,
        title: "Completion setting verified",
        message: state.warnings.join(" "),
      });
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Control Cotypist" });
  }
}
