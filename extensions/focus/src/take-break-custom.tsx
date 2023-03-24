import { Toast, LaunchProps, open } from "@raycast/api";
import { getInstallStatus, takeBreakCustom } from "./utils";

interface FocusArguments {
  minutes?: number;
}

export default async function (props: LaunchProps<{ arguments: FocusArguments }>) {
  const toast = new Toast({
    title: "Starting break",
    style: Toast.Style.Animated,
  });
  await toast.show();

  const { minutes } = props.arguments;

  if (!(await getInstallStatus())) {
    toast.title = "Focus is not installed";
    toast.message = "Install Focus app from: https://heyfocus.com";
    toast.style = Toast.Style.Failure;
    await toast.show();
    return;
  }

  await takeBreakCustom(minutes);
}
