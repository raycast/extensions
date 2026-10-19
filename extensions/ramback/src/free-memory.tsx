import { LaunchProps, Toast, showHUD, showToast } from "@raycast/api";
import { ramback } from "./ramback";

export default async function FreeMemory(props: LaunchProps<{ arguments: { gb: string } }>) {
  const gb = Number(props.arguments.gb.replace(",", "."));
  if (!(gb > 0)) {
    await showToast({ style: Toast.Style.Failure, title: "How many GB? For example 2" });
    return;
  }
  const result = await ramback("free", String(gb));
  const lines = result.stdout.trim().split("\n");
  // The last line says what was freed, or why nothing was.
  await showHUD(lines.findLast((line) => line.startsWith("Freed")) ?? lines.at(-1) ?? "Done");
}
