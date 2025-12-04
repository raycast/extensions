import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { withShottrCheck } from "./utils/checkInstall";
interface Arguments {
  delay?: string;
}

export default withShottrCheck(async function (props: LaunchProps<{ arguments: Arguments }>) {
  const url = "shottr://grab/delayed";
  await closeMainWindow();
  open(url + "?t=" + props?.arguments?.delay || "3");
});
