import { getPreferenceValues } from "@raycast/api";
import { openFolder } from "./utils/open-folder";

export default function Command() {
  return openFolder(getPreferenceValues<Preferences.Projects>().projectsdir);
}
