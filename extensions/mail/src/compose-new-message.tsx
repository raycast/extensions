import { ComposeMessage } from "./components";
import { OutgoingMessageForm } from "./types";

export type ComposeNewMessageProps = {
  draftValues?: OutgoingMessageForm;
};

export default function ComposeNewMessage(props: ComposeNewMessageProps) {
  const { draftValues } = props;

  return <ComposeMessage draftValues={draftValues} />;
}
