import { Action, ActionPanel, Color, Icon, List, Toast, openCommandPreferences, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  DEFAULT_MODEL_ID,
  checkPetalInstallation,
  getModelsDirectoryPath,
  includingSelectedModel,
  loadPetalModels,
  openPetalDeepLink,
  readDefaultString,
  writeDefaultString,
} from "./utils";

export default function Command() {
  const modelsDirectory = getModelsDirectoryPath();

  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const selectedModelID = (await readDefaultString("selected_model_id")) || DEFAULT_MODEL_ID;
    return { selectedModelID, models: includingSelectedModel(loadPetalModels(), selectedModelID) };
  }, []);
  const selectedModelID = data?.selectedModelID;
  const models = data?.models ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Switch model">
      {models.map((model) => {
        const isSelected = model.id === selectedModelID;
        return (
          <List.Item
            key={model.id}
            icon={isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : model.icon}
            title={model.name}
            subtitle={model.provider}
            accessories={[
              ...(model.recommended
                ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Recommended" }]
                : []),
              ...(model.supportsLiveTranscription ? [{ tag: { value: "Live", color: Color.Blue } }] : []),
              ...(model.isDownloaded === false
                ? [{ icon: Icon.Download, text: model.size, tooltip: "Download required" }]
                : model.isDownloaded
                  ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Downloaded" }]
                  : model.size
                    ? [{ text: model.size }]
                    : []),
            ]}
            detail={
              <List.Item.Detail
                markdown={model.summary}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Model ID" text={model.id} />
                    <List.Item.Detail.Metadata.Label title="Provider" text={model.provider} />
                    <List.Item.Detail.Metadata.Label
                      title="Live Transcription"
                      text={model.supportsLiveTranscription ? "Yes" : "No"}
                    />
                    {model.isDownloaded !== undefined && (
                      <List.Item.Detail.Metadata.Label title="Downloaded" text={model.isDownloaded ? "Yes" : "No"} />
                    )}
                    <List.Item.Detail.Metadata.Label title="Selected" text={isSelected ? "Yes" : "No"} />
                    {model.size && <List.Item.Detail.Metadata.Label title="Size" text={model.size} />}
                    <List.Item.Detail.Metadata.Label title="Models Folder" text={modelsDirectory} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Switch Model"
                    icon={Icon.Check}
                    onAction={async () => {
                      const installed = await checkPetalInstallation();
                      if (!installed) return;

                      await writeDefaultString("selected_model_id", model.id);
                      await showToast({ style: Toast.Style.Success, title: `Switched to ${model.name}` });
                      await revalidate();
                    }}
                  />
                  <Action
                    title="Switch Model and Run Setup"
                    icon={Icon.Hammer}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    onAction={async () => {
                      const installed = await checkPetalInstallation();
                      if (!installed) return;

                      await writeDefaultString("selected_model_id", model.id);
                      await openPetalDeepLink("setup");
                      await showToast({
                        style: Toast.Style.Success,
                        title: `Switched to ${model.name}`,
                        message: "Triggered petal://setup",
                      });
                      await revalidate();
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Model ID" content={model.id} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.ShowInFinder title="Show Models Folder" path={modelsDirectory} />
                  <Action title="Open Command Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
