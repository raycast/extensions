import { LaunchProps, Toast, showHUD, showToast } from "@raycast/api";
import { ramback } from "./ramback";

export default async function FreeMemory(props: LaunchProps<{ arguments: Arguments.FreeMemory }>) {
  const gb = Number(props.arguments.gb.replace(",", "."));
  if (!(gb > 0)) {
    await showToast({ style: Toast.Style.Failure, title: "How many GB? For example 2" });
    return;
  }
  const result = await ramback("free", String(gb));
  const lines = (result.stdout || result.stderr).trim().split("\n");
  // The last line says what was freed, or why nothing was.
  const summary = lines.findLast((line) => line.startsWith("Freed")) ?? lines.at(-1) ?? "";
  // 2 means nothing was left to stop, which isn't a failure.
  if (result.code === 0 || result.code === 2) {
    await showHUD(summary || "Done");
  } else {
    await showToast({ style: Toast.Style.Failure, title: "Couldn't free all of it", message: summary });
  }
}
