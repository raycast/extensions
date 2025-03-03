import { LaunchProps, Detail } from "@raycast/api";
import { useAskSupermemory } from "../lib/hooks";
import { showFailureToast } from "@raycast/utils";

export default function Command(props: LaunchProps<{ arguments: Arguments.AskSupermemory }>) {
  const { answer, isLoading, error } = useAskSupermemory(props.arguments.question);

  if (error) {
    console.error(error);
    showFailureToast("Error asking Supermemory. Please try again.");
    return;
  }

  return <Detail markdown={answer.replaceAll("\\n", "\n")} isLoading={isLoading} />;
}
