import { LaunchProps, Toast, showToast } from "@raycast/api";
import { sendMemo } from "./api";

interface TodoArguments {
  text: string;
}

export default async function Command(props: LaunchProps<{ arguments: TodoArguments }>) {
  const { text = "" } = props.arguments;

  showToast({
    style: Toast.Style.Animated,
    title: "Sending",
  });

  const response = await sendMemo({
    content: text,
    visibility: "PRIVATE",
    resourceIdList: [],
  });

  if (response?.name) {
    showToast({
      style: Toast.Style.Success,
      title: "Sent",
    });
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed",
    });
  }
}
