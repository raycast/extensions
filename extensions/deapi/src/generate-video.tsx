import { LaunchProps } from "@raycast/api";
import { GenerateVideoForm } from "./components/GenerateVideoForm";

export default function Command(props: LaunchProps<{ arguments: Arguments.GenerateVideo }>) {
  return <GenerateVideoForm initialPrompt={props.arguments.prompt || props.fallbackText} />;
}
