import { Icon } from "@raycast/api";
import { NamedList } from "./lists";

export default function Command() {
  return (
    <NamedList
      pick={(settings) => settings.smartFolders}
      link="smart-folder"
      verb="Open in Forkz"
      icon={Icon.MagnifyingGlass}
      empty="No smart folders"
      hint="Save a search in forkz with Save as a smart folder in the sidebar."
      noun="smart folders"
    />
  );
}
