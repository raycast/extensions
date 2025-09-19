import { Icon, List, showToast, Toast } from "@raycast/api";
import { RaycastArgumentsOllamaCommandCustom } from "./lib/types";
import { AnswerView } from "./lib/ui/AnswerView/main";

const listErrorLegacyArguments: JSX.Element = (
  <List>
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Error parsing command arguments"
      description="Use “Create Custom Command” instead of running this command directly. If the command was created prior to June 3, 2024, you’ll need to recreate it using the updated prompt format."
    />
  </List>
);

export default function Command(props: RaycastArgumentsOllamaCommandCustom): JSX.Element {
  let server: string;
  let model: string;
  let parameters: any;
  try {
    const modelIndex = props.arguments.model.indexOf(":");
    server = props.arguments.model.substring(0, modelIndex);
    model = props.arguments.model.substring(modelIndex + 1);
    parameters = JSON.parse(props.arguments.parameters);
  } catch (e: any) {
    console.error(e);
    showToast({ style: Toast.Style.Failure, title: "Error", message: e.message });
    return listErrorLegacyArguments;
  }
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
