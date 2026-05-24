import { LaunchProps } from "@raycast/api";
import { focusApp, withBeeperAuth } from "./api";

type FocusAppArguments = {
  chatID?: string;
  messageID?: string;
  draftText?: string;
  draftAttachmentPath?: string;
};

async function FocusAppCommand(props: LaunchProps<{ arguments?: FocusAppArguments }>) {
  await focusApp(props.arguments ?? {});
}

export default withBeeperAuth(FocusAppCommand);
