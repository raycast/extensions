import { withShottrCheck } from "./utils/checkInstall";
import { execSync } from "child_process";

export default withShottrCheck(async function () {
  const url = "shottr://load/clipboard";
  execSync(`open -g ${url}`);
});
