import { showHUD } from "@raycast/api";
import { util_stopbackup } from "./util-destination";

export default async function () {
  await util_stopbackup();
  showHUD("Backup Stopped !");
}
