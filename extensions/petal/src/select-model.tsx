import { Action, ActionPanel, Color, Icon, List, Toast, openCommandPreferences, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  PETAL_MODELS,
  checkPetalInstallation,
  getModelsDirectoryPath,
  openPetalDeepLink,
  readDefaultString,
  writeDefaultString,
} from "./utils";

export default function Command() {
  const modelsDirectory = getModelsDirectoryPath();

  const {
    data: selectedModelID,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    const id = await readDefaultString("selected_model_id");
    return id || "qwen3-asr-0.6b-4bit";
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Switch model">
      {PETAL_MODELS.map((model) => {
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
              { text: model.supportsSmart ? "Smart" : "Verbatim" },
              ...(model.size ? [{ text: model.size }] : []),
            ]}
            detail={
              <List.Item.Detail
                markdown={model.summary}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Model ID" text={model.id} />
                    <List.Item.Detail.Metadata.Label title="Provider" text={model.provider} />
                    <List.Item.Detail.Metadata.Label title="Supports Smart" text={model.supportsSmart ? "Yes" : "No"} />
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
