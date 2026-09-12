import { showToast } from "@raycast/api";
import { open_Url_InChrome } from "./utils-open";
import { get_pref_apachePort } from "./utils-preference";

export default async function Command() {
  open_Url_InChrome("http://localhost:" + get_pref_apachePort() + "/phpMyAdmin5/");
  await showToast({ title: "Opened PHPMyAdmin" });
}
