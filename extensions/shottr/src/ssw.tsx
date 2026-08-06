import { withShottrCheck } from "./utils/checkInstall";
import { withCloseMainWindow } from "./utils/withCloseMainWindow";
import { execSync } from "child_process";

export default withShottrCheck(
  withCloseMainWindow(async function () {
    const url = "shottr://grab/repeat";
    execSync(`open -g ${url}`);
  }),
);
