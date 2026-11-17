import { environment } from "@raycast/api";
import { EditCurrentTimer } from "./commands/menu-bar/EditCurrentTimer";
import { Activity } from "./commands/activities/types";

// Opened from the menu bar with { activity } as context. From Raycast search it edits the running or last timer.
export default function Command() {
  return <EditCurrentTimer activity={environment.launchContext?.activity as Activity | undefined} />;
}
