import { withShottrCheck } from "./utils/checkInstall";
import { withCloseMainWindow } from "./utils/withCloseMainWindow";
import { execSync } from "child_process";

export default withShottrCheck(
  withCloseMainWindow(async function () {
    const url = "shottr://load/file";
    execSync(`open -g ${url}`);
  }),
);
