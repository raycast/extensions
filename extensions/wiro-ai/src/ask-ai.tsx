import { LaunchProps } from "@raycast/api";
import { Chat } from "./components/chat";

export default function AskAi(props: LaunchProps<{ arguments: Arguments.AskAi }>) {
  const question = props.arguments.question?.trim() || props.fallbackText?.trim() || undefined;
  return <Chat initialQuestion={question} />;
}
