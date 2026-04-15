import { execFile, ExecFileException } from "node:child_process";
import { showToast, Toast, LaunchProps } from "@raycast/api";

export default async function Command(props: LaunchProps) {
  execFile("open", ["-a", "/Applications/Glance.app", props.arguments.path], async (err: ExecFileException | null) => {
    if (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open",
        message: err.message,
      });
    }
  });
}
