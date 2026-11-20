import { showError } from "@chrismessina/raycast-kit/toast";
import { LaunchProps } from "@raycast/api";
import { levelLabel, parseLevel } from "./lib/levels";
import { runNoView } from "./lib/no-view";

export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickSetBoost }>) {
  const level = parseLevel(props.arguments.level);
  if (level === undefined) {
    await showError(new Error(`"${props.arguments.level}" is not a level.`), {
      title: "Invalid Boost Level",
      message: "Enter 1.0–1.75, a percent such as 50%, or Off, Low, Medium, High or Max.",
    });
    return;
  }
  await runNoView({ kind: "all", level }, `Setting XDR Boost to ${levelLabel(level)}`);
}
