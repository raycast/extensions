import { RaycastArgumentsOllamaCommandCustom } from "./api/types";
import { AnswerView } from "./api/ui/AnswerView";

export default function Command(props: RaycastArgumentsOllamaCommandCustom): JSX.Element {
  return (
    <AnswerView
      command={!props.arguments.model ? "custom" : undefined}
      model={props.arguments.model}
      prompt={props.arguments.prompt}
      image={props.arguments.image === "yes" ? true : false}
    />
  );
}
