import { closeMainWindow, open } from "@raycast/api";
import { withShottrCheck } from "./utils/checkInstall";

export default withShottrCheck(async function () {
  const url = "shottr://uploads";
  await closeMainWindow();
  open(url);
});
