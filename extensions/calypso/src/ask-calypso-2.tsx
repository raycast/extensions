import { LaunchProps } from "@raycast/api";
import { AskView, PromptForm } from "./ask-view";

const TARGET = "calypso-2";
const TITLE = "Ask Primary Endpoint";

export default function Command(props: LaunchProps<{ arguments: { prompt: string } }>) {
  const initial = (props.arguments?.prompt ?? "").trim();
  if (!initial) return <PromptForm target={TARGET} title={TITLE} />;
  return <AskView prompt={initial} target={TARGET} title={TITLE} />;
}
