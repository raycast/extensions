import { LaunchProps, showHUD } from "@raycast/api";
import { monocle, parsePercent } from "./monocle";

export default async function main(props: LaunchProps<{ arguments: Arguments.SetBlur }>) {
  const pct = parsePercent(props.arguments.level);
  if (pct === null) {
    await showHUD("Enter a number 0–100");
    return;
  }
  await monocle(`blur/${pct}`, `Blur ${pct}%`);
}
