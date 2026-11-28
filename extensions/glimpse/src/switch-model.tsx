import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { ErrorEmptyView } from "./error-view";
import { glimpse, ModelEntry } from "./glimpse";

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async () => {
      const res = await glimpse<{ models: ModelEntry[] }>(["model", "list"]);
      return res.models;
    },
    [],
    { onError: () => undefined },
  );

  async function activate(model: ModelEntry) {
    const target = model.remote ? "remote" : model.key;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Switching model…" });
    try {
      // model set launches Glimpse if needed and requires an active license.
      const res = await glimpse<{ active: string }>(["model", "set", target]);
      toast.style = Toast.Style.Success;
      toast.title = `Active model: ${res.active}`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Glimpse";
      toast.message = (error as Error).message;
    }
  }

  // The CLI can't download models, so hand that off to Glimpse's Models page.
  async function openModels() {
    try {
      await glimpse(["open", "models"]);
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't open Glimpse" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search models">
      {(error ? [] : (data ?? [])).map((model) => {
        const ready = model.installed || model.remote;
        return (
          <List.Item
            key={model.id}
            title={model.label}
            subtitle={model.key}
            icon={{
              source: model.active ? Icon.CheckCircle : ready ? Icon.Circle : Icon.Download,
              tintColor: model.active ? Color.Green : undefined,
            }}
            accessories={[
              {
                tag: model.active
                  ? "active"
                  : model.remote
                    ? "remote"
                    : model.installed
                      ? "installed"
                      : "not installed",
              },
            ]}
            actions={
              <ActionPanel>
                {ready ? (
                  <Action title="Use Model" icon={Icon.Check} onAction={() => activate(model)} />
                ) : (
                  <Action title="Download in Glimpse" icon={Icon.Download} onAction={openModels} />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => revalidate()}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {error ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView title="No models" description="Download a model in Glimpse." />
      )}
    </List>
  );
}
