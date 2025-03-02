import { closeMainWindow, type LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "node:child_process";
import { platform } from "node:os";

export default async function SearchCommand(props: LaunchProps<{ arguments: Arguments.Search }>) {
  const { query } = props.arguments;
  const unduckUrl = "https://unduck.link?q=%s".replace("%s", encodeURIComponent(query));
  const os = platform();

  let command = "";
  if (os === "darwin") {
    command = "open";
  } else if (os === "win32") {
    command = "start";
  } else {
    command = "xdg-open";
  }

  exec(`${command} ${unduckUrl}`, () => {
    showFailureToast("Failed to open URL with und*ck");
  });

  await closeMainWindow({ clearRootSearch: true });
}
