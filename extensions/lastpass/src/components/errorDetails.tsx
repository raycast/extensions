import { Toast, showToast } from "@raycast/api";
import { CommandNotFoundError } from "./commandNotFoundError";
import { UnknownError } from "./unknownError";

export const ErrorDetails = (args: { error: string }) => {
  if (args.error.includes("command not found")) {
    showToast({
      style: Toast.Style.Failure,
      title: "LastPass CLI not found",
      message: args.error,
    });
    return <CommandNotFoundError />;
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: args.error,
    });
    return <UnknownError error={args.error} />;
  }
};
