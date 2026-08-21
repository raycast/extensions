import { LaunchProps } from "@raycast/api";
import { AskView, PromptForm } from "./ask-view";

const TARGET = "auto";
const TITLE = "Ask Calypso";

export default function Command(props: LaunchProps<{ arguments: { prompt: string } }>) {
  const initial = (props.arguments?.prompt ?? "").trim();
  if (!initial) return <PromptForm target={TARGET} title={TITLE} />;
  return <AskView prompt={initial} target={TARGET} title={TITLE} />;
}
