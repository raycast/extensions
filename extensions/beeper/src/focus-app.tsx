import { LaunchProps } from "@raycast/api";
import { focusApp, withBeeperAuth } from "./api";

type FocusAppArguments = {
  chatID?: string;
  messageID?: string;
  draftText?: string;
  draftAttachmentPath?: string;
};

function FocusAppCommand(props: LaunchProps<{ arguments?: FocusAppArguments }>) {
  focusApp(props.arguments ?? {});
  return null;
}

export default withBeeperAuth(FocusAppCommand);
