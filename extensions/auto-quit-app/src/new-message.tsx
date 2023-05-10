import { ComposeMessage } from "./components/compose";
import { OutgoingMessageForm } from "./types";

export interface NewMessageProps {
  draftValues?: OutgoingMessageForm;
}

export default function NewMessage(props: NewMessageProps) {
  const { draftValues } = props;

  return <ComposeMessage draftValues={draftValues} />;
}
