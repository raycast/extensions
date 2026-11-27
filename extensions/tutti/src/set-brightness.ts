import { closeMainWindow, type LaunchProps, showHUD } from "@raycast/api";
import { runTuttiAction } from "./tutti";

export default async function SetBrightness(props: LaunchProps<{ arguments: Arguments.SetBrightness }>) {
  const raw = props.arguments.level.trim();
  if (!/^[+-]?\d+$/.test(raw)) {
    await showHUD("Enter a whole number from 0 to 100");
    return;
  }
  const level = Math.min(100, Math.max(0, Number.parseInt(raw, 10)));
  await closeMainWindow();
  await runTuttiAction(`tutti://brightness?level=${level}`, `Brightness ${level}% requested`);
}
