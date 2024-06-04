import { getPreferenceValues } from "@raycast/api";
import { Preferences, RaycastArgumentsOllamaCommandCustom } from "./lib/types";
import { AnswerView } from "./lib/ui/AnswerView/main";

const p = getPreferenceValues<Preferences>();
if (!p.ollamaCertificateValidation) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(props: RaycastArgumentsOllamaCommandCustom): JSX.Element {
  const modelIndex = props.arguments.model.indexOf(":");
  const server = props.arguments.model.substring(0, modelIndex);
  const model = props.arguments.model.substring(modelIndex + 1);
  const parameters = JSON.parse(props.arguments.parameters);
  return (
    <AnswerView
      server={server}
      model={model}
      prompt={props.arguments.prompt}
      creativity={Number(parameters.creativity)}
      keep_alive={parameters.keep_alive}
    />
  );
}
