import { Clipboard } from "@raycast/api";
import { SpeechView } from "./speech-view";

const getText = () => Clipboard.readText();

export default function Command() {
  return <SpeechView getText={getText} />;
}
