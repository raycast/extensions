import { LaunchProps } from "@raycast/api";
import { GenerateImageForm } from "./components/GenerateImageForm";

export default function Command(props: LaunchProps<{ arguments: Arguments.GenerateImage }>) {
  return <GenerateImageForm initialPrompt={props.arguments.prompt || props.fallbackText} />;
}
