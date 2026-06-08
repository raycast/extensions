import { withShottrCheck } from "./utils/checkInstall";
import { execSync } from "child_process";

export default withShottrCheck(async function () {
  const url = "shottr://ocr";
  execSync(`open -g ${url}`);
});
