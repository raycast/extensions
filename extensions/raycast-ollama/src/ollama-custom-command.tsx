import { RaycastArgumentsOllamaCommandCustom } from "./api/types";
import { ResultView } from "./api/main";

export default function Command(props: RaycastArgumentsOllamaCommandCustom): JSX.Element {
  return ResultView("", undefined, props.arguments.model);
}
