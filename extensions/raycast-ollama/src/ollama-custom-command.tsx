import { RaycastArgumentsOllamaCommandCustom } from "./api/types";
import { AnswerView } from "./api/ui/AnswerView";

export default function Command(props: RaycastArgumentsOllamaCommandCustom): JSX.Element {
  return AnswerView("custom", props.arguments.model);
}
