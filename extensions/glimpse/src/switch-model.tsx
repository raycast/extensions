import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { glimpse, ModelEntry } from "./glimpse";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const res = await glimpse<{ models: ModelEntry[] }>(["model", "list"]);
    return res.models;
  });

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

  async function installAndActivate(model: ModelEntry) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Downloading ${model.label}…`,
    });
    try {
      // model install downloads to the local model cache; can take a while.
      await glimpse(["model", "install", model.key]);
      await glimpse(["model", "set", model.key]);
      toast.style = Toast.Style.Success;
      toast.title = `Active model: ${model.label}`;
      revalidate();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Glimpse";
      toast.message = (error as Error).message;
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search models">
      {(data ?? []).map((model) => {
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
                  <Action title="Download and Use" icon={Icon.Download} onAction={() => installAndActivate(model)} />
                )}
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView title="No models" description="Download a model in Glimpse." />
    </List>
  );
}
