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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withBeeperAuth(FocusAppCommand as any);
