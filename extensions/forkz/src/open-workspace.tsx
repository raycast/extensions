import { Icon } from "@raycast/api";
import { NamedList } from "./lists";

export default function Command() {
  return (
    <NamedList
      pick={(settings) => settings.workspaces}
      link="workspace"
      verb="Open in Forkz"
      icon={Icon.AppWindowGrid2x2}
      empty="No workspaces"
      hint="Save the open tabs in forkz with Window > Workspaces > Save Workspace."
      noun="workspaces"
    />
  );
}
