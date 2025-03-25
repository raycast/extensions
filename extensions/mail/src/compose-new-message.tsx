import { OutgoingMessageForm } from "./types";
import { ComposeMessage } from "./components";

export type ComposeNewMessageProps = {
  draftValues?: OutgoingMessageForm;
};

export default function ComposeNewMessage(props: ComposeNewMessageProps) {
  const { draftValues } = props;

  return <ComposeMessage draftValues={draftValues} />;
}
