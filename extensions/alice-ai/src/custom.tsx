import { Detail, LaunchProps, getPreferenceValues } from "@raycast/api";
import SelectedTextAction from "./components/SelectedTextAction";
import { AvailableModels, DefaultModel, Model, getCurrentModel, getReasoningLevel } from "./lib/OpenAI";
import { useActionsAreReady } from "./store/actions";
import { Action } from "./types";

interface Arguments {
  prompt: string;
}

export default function CustomCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const ready = useActionsAreReady();

  if (!ready) {
    return <Detail isLoading />;
  }

  if (props.arguments.prompt?.trim().length === 0) {
    return (
      <Detail
        markdown={`## ⚠️ No Prompt Provided\n\nWe're sorry, but it seems like no prompt has been provided. Please ensure that you provide a prompt before attempting the action again.`}
        navigationTitle="No Prompt Provided"
      />
    );
  }

  const preferences = getPreferenceValues<Preferences.Custom>();
  const currentModel = getCurrentModel(preferences.model as Model);
  const model = AvailableModels[currentModel] ? currentModel : DefaultModel;
  const action: Action = {
    id: "00000000-0000-0000-0000-000000000000",
    name: "Custom Action",
    description: "User defined prompt",
    model,
    reasoningLevel: getReasoningLevel(model, preferences.reasoningLevel),
    temperature: preferences.temperature,
    maxTokens: preferences.maxTokens,
    systemPrompt: props.arguments.prompt,
    color: "#a8a29e",
    favorite: false,
  };

  return <SelectedTextAction action={action} />;
}
