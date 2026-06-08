import { LaunchProps } from "@raycast/api";
import { withShottrCheck } from "./utils/checkInstall";
import { execSync } from "child_process";

interface Arguments {
  delay?: string;
}

export default withShottrCheck(async function (props: LaunchProps<{ arguments: Arguments }>) {
  const url = "shottr://grab/delayed";
  execSync(`open -g ${url}?t=${props?.arguments?.delay || "3"}`);
});
