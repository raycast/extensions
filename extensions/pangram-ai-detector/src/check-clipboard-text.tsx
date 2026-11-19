import { CheckView } from "./check-view";
import { readClipboard } from "./sources";

export default function Command() {
  return <CheckView readSource={readClipboard} />;
}
