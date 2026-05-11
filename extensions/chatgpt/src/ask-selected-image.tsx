import { LaunchProps } from "@raycast/api";
import { VisionView } from "./views/vision";

export interface AskArguments {
  query: string;
}

export default function Command(props: LaunchProps<{ arguments: AskArguments }>) {
  return <VisionView user_prompt={props.arguments.query} toast_title={"thinking..."} load={"selected"} />;
}
