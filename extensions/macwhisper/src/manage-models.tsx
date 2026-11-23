import { Action, ActionPanel, Color, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { errorMessage, getVersion, listModels, MACWHISPER_BUNDLE_ID, Model, selectModel } from "./lib/mw";

export default function Command() {
  const { data: models = [], isLoading, mutate, error } = useCachedPromise(listModels);
  // The models request already reports CLI failures; keep the version lookup silent.
  const { data: version } = useCachedPromise(getVersion, [], { onError: () => undefined });

  async function activate(model: Model) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Switching to ${model.name}…` });
    try {
      await mutate(selectModel(model.id), {
        optimisticUpdate: (current = []) => current.map((item) => ({ ...item, active: item.id === model.id })),
      });
      toast.style = Toast.Style.Success;
      toast.title = `${model.name} is now the active model`;
    } catch (selectError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not switch model";
      toast.message = errorMessage(selectError);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search downloaded models">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not reach MacWhisper"
          description={errorMessage(error)}
          actions={
            <ActionPanel>
              <Action title="Open MacWhisper" icon={Icon.AppWindow} onAction={() => open(MACWHISPER_BUNDLE_ID)} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Download}
          title="No downloaded models"
          description="Download a model from MacWhisper's settings."
        />
      )}
      <List.Section title="Downloaded Models" subtitle={version}>
        {models.map((model) => (
          <List.Item
            key={model.id}
            icon={model.active ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            title={model.name}
            subtitle={model.id}
            keywords={[model.id]}
            accessories={[
              ...(model.active ? [{ tag: { value: "Active", color: Color.Green } }] : []),
              { text: model.size },
            ]}
            actions={
              <ActionPanel>
                {!model.active && (
                  <Action title="Set as Active Model" icon={Icon.CheckCircle} onAction={() => activate(model)} />
                )}
                <Action.CopyToClipboard title="Copy Model ID" content={model.id} />
                <Action title="Open MacWhisper" icon={Icon.AppWindow} onAction={() => open(MACWHISPER_BUNDLE_ID)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
