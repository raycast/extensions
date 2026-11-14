import { LaunchProps } from "@raycast/api";
import { AskForm, AskView } from "./ask-view";

export default function Command(props: LaunchProps<{ arguments: Arguments.AskYab }>) {
  const prompt = props.arguments.prompt?.trim() || props.fallbackText?.trim();
  return prompt ? <AskView prompt={prompt} /> : <AskForm />;
}
