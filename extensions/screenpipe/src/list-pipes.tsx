import { ActionPanel, Action, List, Icon, showToast, Toast, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useFrecencySorting } from "@raycast/utils";
import { PipeApi } from "./api";

export default function Command() {
  const {
    data: pipes,
    isLoading,
    mutate,
  } = usePromise(async () => {
    const api = new PipeApi();
    return api.listPipes();
  }, []);

  const { data: sortedPipes, visitItem } = useFrecencySorting(pipes ?? [], {
    namespace: "screenpipe-visits",
  });

  return (
    <List isLoading={isLoading}>
      {sortedPipes.map((pipe) => (
        <List.Item
          key={pipe.id}
          title={pipe.id.charAt(0).toUpperCase() + pipe.id.slice(1)}
          icon={Icon.Window}
          accessories={[
            {
              tag: pipe.port?.toString(),
            },
            {
              icon: {
                source: pipe.enabled ? Icon.Checkmark : Icon.XMarkCircle,
                tintColor: pipe.enabled ? Color.Green : Color.Red,
              },
            },
          ]}
          actions={
            <ActionPanel>
              {pipe.enabled && (
                <Action.OpenInBrowser
                  url={`http://localhost:${pipe.port}`}
                  onOpen={() => visitItem(pipe)}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
              )}
              {pipe.enabled ? (
                <Action
                  title="Disable Pipe"
                  icon={Icon.Pause}
                  onAction={async () => {
                    const api = new PipeApi();
                    await api.disablePipe(pipe.id);
                    await mutate();
                    showToast({
                      title: "Pipe disabled",
                      message: "The pipe has been disabled",
                      style: Toast.Style.Success,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              ) : (
                <Action
                  title="Enable Pipe"
                  icon={Icon.Play}
                  onAction={async () => {
                    const api = new PipeApi();
                    await api.enablePipe(pipe.id);
                    await mutate();
                    showToast({
                      title: "Pipe enabled",
                      message: "The pipe has been enabled",
                      style: Toast.Style.Success,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
