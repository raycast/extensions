import { LaunchProps } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { focusApp, createBeeperOAuth } from "./api";

type FocusAppArguments = {
  chatID?: string;
  messageID?: string;
  draftText?: string;
  draftAttachmentPath?: string;
};

async function FocusAppCommand(props: LaunchProps<{ arguments?: FocusAppArguments }>) {
  await focusApp(props.arguments ?? {});
}

export default withAccessToken(createBeeperOAuth())(FocusAppCommand);
