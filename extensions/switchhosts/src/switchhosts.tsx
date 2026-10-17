import { List, Detail, Icon, Color, ActionPanel, showToast, Toast, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

interface HostsListResponse {
  success: boolean;
  data: HostsItem[];
}

interface CommonHostsItem {
  id: string;
  type: "local" | "remote" | "group" | "folder";
  on: boolean;
  title: string;
}

interface RemoteHostsItem extends CommonHostsItem {
  type: "remote";
  url: string;
  refresh_interval: number;
  last_refresh: string;
  last_refresh_ms: number;
}

interface LocalHostsItem extends CommonHostsItem {
  type: "local";
}

interface GroupHostsItem extends CommonHostsItem {
  type: "group";
  include: string[];
}

interface FolderHostsItem extends CommonHostsItem {
  type: "folder";
  /** Choice Mpde: 0: default, 1: single, 2: multiple   */
  folder_mode: 0 | 1 | 2;
}

type HostsItem = LocalHostsItem | RemoteHostsItem | GroupHostsItem | FolderHostsItem;

export default function SwitchHostsList() {
  const { isLoading, data, error, mutate, revalidate } = useCachedPromise(
    async () => {
      const response = await getSwitchHostsList();
      const result = (await response.json()) as HostsListResponse;
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
3. Make sure "Enable HTTP API" is enabled in SwitchHosts preferences`;

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
    <List isLoading={isLoading} isShowingDetail>
      {data.map((item: HostsItem, index: number) => (
        <List.Item
          key={index}
          title={item.title}
          id={item.id}
          icon={{
            source: item.on ? Icon.Checkmark : Icon.Circle,
            tintColor: item.on ? Color.Green : Color.SecondaryText,
          }}
          accessories={[{ icon: getAccessoryIcon(item.type), tooltip: capitalize(item.type || "local") }]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={item.on ? { value: "On", color: Color.Green } : { value: "Off", color: Color.SecondaryText }}
                  />
                  <List.Item.Detail.Metadata.Label title="Hosts Type" text={capitalize(item.type)} />
                  <List.Item.Detail.Metadata.Label title="Hosts Title" text={item.title} />
                  {item.type === "remote" && (
                    <>
                      <List.Item.Detail.Metadata.Label title="URL" text={item.url} />
                      <List.Item.Detail.Metadata.Label
                        title="Auto Refresh"
                        text={formatInterval(item.refresh_interval ?? 0)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Last Refresh"
                        text={item.refresh_interval ? `${item.last_refresh}` : "Unknown"}
                      />
                    </>
                  )}
                  {item.type === "group" && (
                    <>
                      <List.Item.Detail.Metadata.Label
                        title={`Content (${item.include.length})`}
                        text={formatGroupTypeInclude(item.include, data).join(", ")}
                      />
                    </>
                  )}
                  {item.type === "folder" && (
                    <>
                      <List.Item.Detail.Metadata.Label
                        title="Choice Mode"
                        text={formatFolderTypeMode(item.folder_mode)}
                      />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                icon={item.on ? Icon.Xmark : Icon.Check}
                title={item.on ? "Disable" : "Enable"}
                onAction={async () => {
                  const toast = await showToast(Toast.Style.Animated, item.on ? "Disabling" : "Enabling", item.title);
                  const hint = item.on ? "disabled" : "enabled";
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
                    toast.message = `${item.title} ${hint}`;
                  } catch {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed";
                    toast.message = `${item.title} ${hint}`;
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

function getSwitchHostsList() {
  return fetch("http://127.0.0.1:50761/api/list", { method: "GET" });
}

function switchHost(id: string) {
  return fetch(`http://127.0.0.1:50761/api/toggle?id=${id}`, { method: "GET" });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.substring(1).toLowerCase();
}

function formatInterval(seconds: number): string {
  if (!seconds) return "Never";
  if (seconds < 60) return `${seconds} s`;

  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} ${m === 1 ? "Minute" : "Minutes"}`;

  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "Hour" : "Hours"}`;

  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "Day" : "Days"}`;
}

function formatGroupTypeInclude(ids: string[], allList: HostsItem[]): string[] {
  return ids.map((id) => {
    const matched = allList.find((item) => item.id === id);
    return matched?.title ?? id;
  });
}

function formatFolderTypeMode(mode: FolderHostsItem["folder_mode"]) {
  const map = {
    0: "Default",
    1: "Single",
    2: "Multiple",
  };

  return map[mode];
}
