import { closeMainWindow } from "@raycast/api";
import { withShottrCheck } from "./utils/checkInstall";
import { execSync } from "child_process";

export default withShottrCheck(async function () {
  const url = "shottr://grab/delayed";
  closeMainWindow();
  execSync(`open -g ${url}`);
});
