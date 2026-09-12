import { Toast, showToast } from "@raycast/api";
import { CommandNotFoundError } from "./commandNotFoundError";
import { UnknownError } from "./unknownError";

const mask = (content: string, mask: string) => content.replace(mask, "*".repeat(mask.toString().length));

export const ErrorDetails = (args: { maskPattern: string; error: string }) => {
  const maskedError = mask(args.error, args.maskPattern);
  if (args?.error?.includes("command not found")) {
    showToast({
      style: Toast.Style.Failure,
      title: "LastPass CLI not found",
      message: maskedError,
    });
    return <CommandNotFoundError />;
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: maskedError,
    });
    return <UnknownError error={maskedError} />;
  }
};
