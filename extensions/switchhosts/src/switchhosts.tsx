import { List, Detail, Icon, Color, ActionPanel, showToast, Toast, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

interface switchHostsList {
  success: boolean;
  data: Array<switchHosts>;
}

interface switchHosts {
  title: string;
  id: string;
  on?: boolean;
  type?: string;
}

function getSwitchHostsList() {
  return fetch("http://127.0.0.1:50761/api/list", { method: "GET" });
}

function switchHost(id: string) {
  return fetch(`http://127.0.0.1:50761/api/toggle?id=${id}`, { method: "GET" });
}

function getAccessoryIcon(type?: string) {
  switch (type) {
    case "folder":
      return Icon.Folder;
    case "group":
      return Icon.Layers;
    case "remote":
      return Icon.Globe;
    default:
      return Icon.Document;
  }
}

export default function SwitchHostsList() {
  const { isLoading, data, error, mutate, revalidate } = useCachedPromise(
    async () => {
      const response = await getSwitchHostsList();
      const result = (await response.json()) as switchHostsList;
      if (!result.success) throw new Error("Something went wrong");
      return result.data;
    },
    [],
    {
      initialData: [],
    },
  );

  if (error) {
    const errorMsg = `## Unable to Connect to SwitchHosts HTTP API

Checklist:

1. Make sure [SwitchHosts](https://switchhosts.vercel.app/) is installed
2. Make sure SwitchHosts is open
3. Make sure "Enable HTTP API" is enabled in SwitchHosts settings`;
    return (
      <Detail
        markdown={errorMsg}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => revalidate()}></Action>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      {data.map((item: switchHosts, index: number) => (
        <List.Item
          key={index}
          title={item.title}
          icon={{
            source: item.on ? Icon.Checkmark : Icon.Circle,
            tintColor: item.on ? Color.Green : Color.Blue,
          }}
          accessories={[{ icon: getAccessoryIcon(item.type), tooltip: item.type || "local" }]}
          actions={
            <ActionPanel>
              <Action
                icon={item.on ? Icon.Xmark : Icon.Check}
                title={item.on ? "Close" : "Open"}
                onAction={async () => {
                  const toast = await showToast(Toast.Style.Animated, item.on ? "Closing" : "Opening", item.title);
                  const action = item.on ? "Close" : "Open";
                  try {
                    await mutate(
                      switchHost(item.id).then(async (res) => {
                        const isSwitchSuccess = await res.text();
                        if (isSwitchSuccess !== "ok") throw new Error("Something went wrong");
                      }),
                      {
                        optimisticUpdate(data) {
                          return data.map((d) => (d.id === item.id ? { ...d, on: !d.on } : d));
                        },
                        shouldRevalidateAfter: false,
                      },
                    );
                    toast.style = Toast.Style.Success;
                    toast.title = "Success";
                    toast.message = `${action} Host ${item.title} Success`;
                  } catch {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed";
                    toast.message = `${action} Host ${item.title} Failed`;
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
