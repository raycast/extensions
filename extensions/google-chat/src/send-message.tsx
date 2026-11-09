import type { LaunchProps } from "@raycast/api";

import { ChatView } from "./components/ChatView";
import { SendMessageForm, type SendMessageValues } from "./components/SendMessageForm";

export default function Command(props: LaunchProps<{ draftValues: SendMessageValues }>) {
  return (
    <ChatView>
      <SendMessageForm draftValues={props.draftValues} enableDrafts />
    </ChatView>
  );
}
