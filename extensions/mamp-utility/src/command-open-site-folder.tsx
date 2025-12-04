import { open_Folder_InFinder } from "./utils-open";
import { get_pref_siteFolder } from "./utils-preference";

export default async function Command() {
  const site_path = get_pref_siteFolder();
  await open_Folder_InFinder(site_path);
}
