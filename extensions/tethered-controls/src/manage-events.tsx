import { environment, launchCommand, LaunchProps, LaunchType, updateCommandMetadata } from "@raycast/api";
import { listEvents } from "./events";
import { nextEventSubtitle } from "./event-subtitle";

export default async function Command({ launchContext }: LaunchProps) {
  if (launchContext && (typeof launchContext.subtitle === "string" || launchContext.subtitle === null)) {
    await updateCommandMetadata({ subtitle: launchContext.subtitle });
    return;
  }
  try {
    await updateCommandMetadata({ subtitle: nextEventSubtitle(await listEvents()) });
  } catch {
    await updateCommandMetadata({ subtitle: null });
  }
  if (environment.launchType !== LaunchType.Background) {
    await launchCommand({ name: "manage-events-view", type: LaunchType.UserInitiated });
  }
}
