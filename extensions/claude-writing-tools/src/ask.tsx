import { LaunchProps } from "@raycast/api";
import { Chat, type ChatSeed } from "./components/Chat";

/** Also the target of the screenshot commands, which pass a seed as launch context. */
export default function Command(props: LaunchProps<{ arguments: Arguments.Ask; launchContext?: ChatSeed }>) {
  const question = (props.arguments.question || props.fallbackText || "").trim();
  const seed: ChatSeed | undefined = props.launchContext ?? (question ? { prompt: question, send: true } : undefined);
  return <Chat seed={seed} />;
}
