import { closeMainWindow, open, LaunchProps } from "@raycast/api";
import { checkDropshareInstallation, isDropshareInstalled } from "./utils/check";

interface Upload {
  file: string;
}

export default async function Upload(props: LaunchProps<{ arguments: Upload }>) {
  const { file } = props.arguments;

  checkDropshareInstallation();

  if ((await isDropshareInstalled()) === true) {
    const url = "dropshare5:///action/upload?file=" + file;
    open(url);
    await closeMainWindow();
  }
}
