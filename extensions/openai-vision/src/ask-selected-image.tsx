import { LaunchProps } from "@raycast/api";
import { ResultView } from "./components/ResultView";

export interface AskArguments {
  query: string;
}

export default function Command(props: LaunchProps<{ arguments: AskArguments }>) {
  return (
    <ResultView
      user_prompt={props.arguments.query}
      model_override={"gpt-4o"}
      toast_title={"thinking..."}
      load={"selected"}
    />
  );
}
