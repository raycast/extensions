import { CheckView } from "./check-view";
import { readSelectionOrClipboard } from "./sources";

export default function Command() {
  return <CheckView readSource={readSelectionOrClipboard} />;
}
