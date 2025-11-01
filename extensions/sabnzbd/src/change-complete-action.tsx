import { LaunchProps, showToast, Toast } from "@raycast/api";
import { client } from "./sabnzbd";

export default async (props: LaunchProps<{ arguments: Arguments.ChangeCompleteAction }>) => {
  const { action } = props.arguments;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Changing Complete Action" });
  try {
    await client.changeCompleteAction(action).then((result) => {
      if (!result.status || result.error) throw new Error();
    });
    toast.style = Toast.Style.Success;
    toast.title = "Changed Complete Action";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not change Complete Action";
  }
};
