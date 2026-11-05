import { getSelectedText } from "@raycast/api";
import { SpeechView } from "./speech-view";

export default function Command() {
  return <SpeechView getText={getSelectedText} />;
}
