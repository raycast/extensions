import { LaunchProps } from "@raycast/api";
import { withShottrCheck } from "./utils/checkInstall";
import { withCloseMainWindow } from "./utils/withCloseMainWindow";
import { execSync } from "child_process";

interface Arguments {
  delay?: string;
}

export default withShottrCheck(
  withCloseMainWindow(async function (props: LaunchProps<{ arguments: Arguments }>) {
    const url = "shottr://grab/delayed";
    execSync(`open -g ${url}?t=${props?.arguments?.delay || "3"}`);
  }),
);
