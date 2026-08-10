import { Detail, LaunchProps, getPreferenceValues } from "@raycast/api";
import ExecuteAction from "./components/ExecuteAction";
import { useSelectedText } from "./hooks";
import "./lib/OpenAI";
import { Model } from "./lib/OpenAI";
import { useActionsAreReady } from "./store/actions";
import { Action } from "./types";

interface Arguments {
  prompt: string;
}

interface Preferences {
  model: string;
  temperature: string;
  maxTokens: string;
}

export default function CustomCommand(props: LaunchProps<{ arguments: Arguments }>) {
  const ready = useActionsAreReady();
  const preferences = getPreferenceValues<Preferences>();
  const selectedText = useSelectedText();

  if (!ready) {
    return <Detail />;
  }

  if (selectedText.success === undefined) {
    return <Detail isLoading={true} />;
  }

  if (selectedText.success === false) {
    return (
      <Detail
        markdown={`## ⚠️ No Text Selected\n\nWe're sorry, but it seems like no text has been selected. Please ensure that you highlight the desired text before attempting the action again.`}
        navigationTitle="No Text Selected"
      />
    );
  }

  if (props.arguments.prompt?.trim().length === 0) {
    return (
      <Detail
        markdown={`## ⚠️ No Prompt Provided\n\nWe're sorry, but it seems like no prompt has been provided. Please ensure that you provide a prompt before attempting the action again.`}
        navigationTitle="No Prompt Provided"
      />
    );
  }

  const action: Action = {
    id: "00000000-0000-0000-0000-000000000000",
    name: "Custom Action",
    description: "User defined prompt",
    model: preferences.model as Model,
    systemPrompt: props.arguments.prompt,
    color: "#a8a29e",
    favorite: false,
    temperature: preferences.temperature,
    maxTokens: preferences.maxTokens,
  };

  return <ExecuteAction action={action} prompt={selectedText.text} />;
}
