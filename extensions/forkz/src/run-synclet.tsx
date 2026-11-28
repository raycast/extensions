import { Icon } from "@raycast/api";
import { NamedList } from "./lists";

export default function Command() {
  return (
    <NamedList
      pick={(settings) => settings.synclets}
      link="synclet"
      verb="Run in forkz"
      icon={Icon.ArrowClockwise}
      empty="No synclets"
      hint="Save one in forkz's Sync Folders window with Save as Synclet."
      noun="synclets"
    />
  );
}
