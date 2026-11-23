import { LaunchProps, Toast, showToast } from "@raycast/api";
import { runConsortAction } from "./lib/consort";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SetVolume }>) {
  const raw = props.arguments.level.trim().replace("%", "");
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid volume",
      message: "Enter a percentage between 0 and 100.",
    });
    return;
  }

  const clamped = Math.round(parsed);
  await runConsortAction(`volume?set=${clamped}`, { hudMessage: `Consort · Volume ${clamped}%` });
}
