import { LaunchProps, showHUD } from "@raycast/api";
import { sendGatherKeystroke } from "./utils";

type Status = "available" | "busy" | "away";

const STATUS_CONFIG: Record<Status, { key: string; label: string }> = {
  available: { key: "o", label: "Available" },
  busy: { key: "i", label: "Busy" },
  away: { key: "u", label: "Away" },
};

export default async function Command(props: LaunchProps<{ arguments: { status: Status } }>) {
  const { status } = props.arguments;
  const config = STATUS_CONFIG[status];
  if (await sendGatherKeystroke(config.key, ["command down"])) {
    await showHUD(`Status set to ${config.label}`);
  }
}
