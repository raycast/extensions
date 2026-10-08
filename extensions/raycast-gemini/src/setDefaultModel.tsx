import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useActiveModel } from "./api/useActiveModel";
import { useAvailableModels } from "./api/useAvailableModels";

export default function SetDefaultModel() {
  const { models, isLoading: modelsLoading } = useAvailableModels();
  const { activeModel, setActiveModel, isLoading: activeLoading } = useActiveModel();
  const { apiKey } = getPreferenceValues<Preferences>();

  const isLoading = modelsLoading || activeLoading;
  const needsApiKey = !apiKey || apiKey.trim().length === 0;

  const handleSelect = async (model: string) => {
    try {
      await setActiveModel(model);
      await showToast({
        style: Toast.Style.Success,
        title: "Default model updated",
        message: model,
      });
    } catch (error) {
      console.error("Failed to save default model:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save default model",
        message: "Please try again.",
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search available models..." isShowingDetail={models.length > 0}>
      {needsApiKey && !isLoading ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="API Key Required"
          description="Add your Gemini API key in the extension preferences."
        />
      ) : models.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="No Models Found"
          description="Could not load models from Google. Check your API key and network connection."
        />
      ) : (
        models.map((model) => {
          const isCurrent = activeModel === model.name;
          return (
            <List.Item
              key={model.name}
              title={model.displayName}
              subtitle={model.name}
              icon={isCurrent ? Icon.Checkmark : Icon.Dot}
              accessories={isCurrent ? [{ icon: Icon.Checkmark, text: "Default" }] : undefined}
              detail={
                <List.Item.Detail
                  markdown={`## ${model.displayName}\n\n\`${model.name}\`\n\n${
                    isCurrent
                      ? "**This is currently your default model.**"
                      : "Select to set this as your default model."
                  }`}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={isCurrent ? "Currently Default" : "Set as Default"}
                    icon={isCurrent ? Icon.Checkmark : Icon.Check}
                    onAction={() => handleSelect(model.name)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
