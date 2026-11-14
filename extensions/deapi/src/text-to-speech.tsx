import { LaunchProps } from "@raycast/api";
import { Loader } from "./components/Loader";
import { TextToSpeechForm } from "./components/TextToSpeechForm";
import { selectedText } from "./lib/selection";

export default function Command(props: LaunchProps) {
  if (props.fallbackText) return <TextToSpeechForm initialText={props.fallbackText} />;
  return <Loader load={selectedText} render={(text) => <TextToSpeechForm initialText={text} />} />;
}
