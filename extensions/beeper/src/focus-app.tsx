import { LaunchProps } from "@raycast/api";
import { useEffect } from "react";
import { focusApp, withBeeperAuth } from "./api";

type FocusAppArguments = {
  chatID?: string;
  messageID?: string;
  draftText?: string;
  draftAttachmentPath?: string;
};

function FocusAppCommand(props: LaunchProps<{ arguments?: FocusAppArguments }>) {
  useEffect(() => {
    focusApp(props.arguments ?? {});
  }, []);
  return null;
}

export default withBeeperAuth(FocusAppCommand);
