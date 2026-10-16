import { CheckView } from "./check-view";
import { readSelection } from "./sources";

export default function Command() {
  return <CheckView readSource={readSelection} />;
}
