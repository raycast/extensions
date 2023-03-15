import { Toast, showToast } from "@raycast/api";
import { CommandNotFoundError } from "./commandNotFoundError";
import { UnknownError } from "./unknownError";

export const ErrorDetails = (args: { error: Error }) => {
  if (args.error.message.includes("command not found")) {
    showToast({
      style: Toast.Style.Failure,
      title: "LastPass CLI not found",
      message: args.error.message,
    });
    return <CommandNotFoundError />;
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: args.error.message,
    });
    return <UnknownError error={args.error} />;
  }
};
