import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { getFavicon, useFetch, useForm } from "@raycast/utils";

interface Watch {
  last_changed: number;
  last_checked: number;
  last_error: false | string;
  title: string | null;
  url: string;
  viewed: boolean;
}
interface WatchesResponse {
  [key: string]: Watch;
}

const { instance_url, api_key } = getPreferenceValues<Preferences>();
const headers = {
  "Content-Type": "application/json",
  "x-api-key": api_key,
};

function useApi<T>(endpoint: string) {
  const url = new URL(`api/v1/${endpoint}`, instance_url).toString();
  return useFetch<T>(url, {
    headers,
  });
}
async function callApi(
  endpoint: string,
  { method, body }: { method: "DELETE" | "POST"; body?: Record<string, string | boolean> },
) {
  const url = new URL(`api/v1/${endpoint}`, instance_url).toString();
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) {
    const err = result as { message: string } | string;
    throw new Error(typeof err === "object" ? err.message : err);
  }
  return result;
}

export default function ListWatches() {
  try {
    new URL(instance_url);
  } catch {
    return (
      <Detail
        markdown={"# Error \n\n Invalid URL"}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
  const url = new URL(instance_url).toString();

  const { isLoading, data, error, revalidate, mutate } = useApi<WatchesResponse>("watch");

  return (
    <List isLoading={isLoading}>
      {!isLoading && !error && data && (
        <List.EmptyView
          title="No website watches configured."
          description="Create new watch."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Watch" target={<CreateWatch onCreate={revalidate} />} />
            </ActionPanel>
          }
        />
      )}
      {data &&
        Object.entries(data).map(([id, watch]) => {
          const keywords: string[] = [];
          if (watch.title) keywords.push(watch.title);

          const icon = getFavicon(watch.url, { fallback: Icon.Globe });

          return (
            <List.Item
              key={id}
              icon={icon}
              title={watch.url}
              subtitle={watch.title ?? undefined}
              keywords={keywords}
              accessories={[
                {
                  ...(watch.last_error && {
                    icon: { source: Icon.Warning, tintColor: Color.Red },
                    tooltip: watch.last_error,
                  }),
                },
                { icon: watch.viewed ? Icon.Eye : Icon.EyeDisabled, tooltip: watch.viewed ? "Viewed" : "Not Viewed" },
                watch.last_checked
                  ? { date: new Date(watch.last_checked * 1000), tooltip: "Last Checked", icon: Icon.MagnifyingGlass }
                  : { text: "Not yet", tooltip: "Last Checked", icon: Icon.MagnifyingGlass },
                watch.last_changed
                  ? { date: new Date(watch.last_changed * 1000), tooltip: "Last Changed", icon: Icon.Pencil }
                  : { text: "Not yet", tooltip: "Last Changed", icon: Icon.Pencil },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Eye} title="View Details" target={<WatchDetails id={id} />} />
                  <Action.OpenInBrowser icon={Icon.ArrowNe} title="Preview" url={`${url}preview/${id}#text`} />
                  <Action.Push
                    icon={Icon.List}
                    title="View History"
                    target={<WatchHistory id={id} />}
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                  <Action.OpenInBrowser
                    icon={Icon.ArrowNe}
                    title="Edit"
                    url={`${url}edit/${id}#general`}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />
                  <Action.OpenInBrowser icon={icon} url={watch.url} shortcut={Keyboard.Shortcut.Common.Open} />
                  <Action
                    icon={Icon.Trash}
                    title="Delete Watch"
                    onAction={() =>
                      confirmAlert({
                        title: "Delete",
                        message: watch.url,
                        primaryAction: {
                          style: Alert.ActionStyle.Destructive,
                          title: "Delete Watch?",
                          async onAction() {
                            const toast = await showToast(Toast.Style.Animated, "Deleting");
                            try {
                              await mutate(
                                callApi(`watch/${id}`, {
                                  method: "DELETE",
                                }),
                                {
                                  optimisticUpdate(data) {
                                    if (data) delete data[id];
                                    return data;
                                  },
                                  shouldRevalidateAfter: false,
                                },
                              );
                              toast.style = Toast.Style.Success;
                              toast.title = "Deleted";
                            } catch (error) {
                              toast.style = Toast.Style.Failure;
                              toast.title = "Failed";
                              toast.message = `${error}`;
                            }
                          },
                        },
                      })
                    }
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                  <Action.Push
                    icon={Icon.Plus}
                    title="Create Watch"
                    target={<CreateWatch onCreate={revalidate} />}
                    shortcut={Keyboard.Shortcut.Common.New}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

function WatchDetails({ id }: { id: string }) {
  interface WatchDetails extends Watch {
    check_count: number;
    date_created: number;
    last_viewed: number;
    method: "OPTIONS" | "GET" | "DELETE" | "PATCH" | "POST" | "PUT";
    notification_alert_count: number;
    paused: boolean;
    processor: "restock_diff" | "text_json_diff";
    sort_text_alphabetically: boolean;
    tags: string[];
    uuid: string;
    last_notification_error: false | string;
    history_n: number;
  }
  const { isLoading, data } = useApi<WatchDetails>(`watch/${id}`);
  const markdown = !data ? "" : `${data.title ?? ""} \n\n ${data.url}`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Check Count" text={data.check_count.toString()} />
            <Detail.Metadata.Label title="Date Created" text={new Date(data.date_created * 1000).toString()} />
            <Detail.Metadata.Label
              title="Last Viewed"
              text={data.last_viewed ? new Date(data.last_viewed * 1000).toString() : "N/A"}
            />
            <Detail.Metadata.Label title="Method" text={data.method} />
            <Detail.Metadata.Label title="Notification Alert Count" text={data.notification_alert_count.toString()} />
            <Detail.Metadata.Label title="Paused" icon={data.paused ? Icon.Check : Icon.Xmark} />
            <Detail.Metadata.Label
              title="Processor"
              text={
                data.processor === "restock_diff"
                  ? "Re-stock & Price detection for single product pages"
                  : "Webpage Text/HTML, JSON and PDF changes"
              }
            />
            <Detail.Metadata.Label title="Sort Text Alphabetically" icon={data.paused ? Icon.Check : Icon.Xmark} />
          </Detail.Metadata>
        )
      }
    />
  );
}

function WatchHistory({ id }: { id: string }) {
  interface WatchHistory {
    [timestamp: string]: string;
  }
  const { isLoading, data } = useApi<WatchHistory>(`watch/${id}/history`);

  return (
    <List isLoading={isLoading}>
      {data &&
        Object.keys(data).map((timestamp) => (
          <List.Item
            key={timestamp}
            title={new Date(+timestamp * 1000).toUTCString()}
            accessories={[{ date: new Date(+timestamp * 1000) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.ArrowNe}
                  title="View Snapshot"
                  url={`${new URL(`preview/${id}`, instance_url)}?version=${timestamp}#text`}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function CreateWatch({ onCreate }: { onCreate: () => void }) {
  const { pop } = useNavigation();
  interface FormValues {
    url: string;
    title: string;
    paused: boolean;
    muted: boolean;
    method: string;
  }
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.title);
      try {
        await callApi("watch", {
          method: "POST",
          body: { ...values },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        onCreate();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      url: "https://",
      paused: true,
    },
    validation: {
      url(value) {
        if (!value) return "The item is required";
        try {
          new URL(value);
        } catch {
          return "Must be a valid URL";
        }
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Watch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="URL" placeholder="https://..." info="URL to monitor for changes" {...itemProps.url} />
      <Form.Separator />
      <Form.TextField title="Title" info="Custom title for the watch" {...itemProps.title} />
      <Form.Checkbox label="Paused" info="Whether the watch is paused" {...itemProps.paused} />
      <Form.Checkbox label="Muted" info="Whether notifications are muted" {...itemProps.muted} />
      <Form.Dropdown title="Method" {...itemProps.method}>
        <Form.Dropdown.Item title="GET" value="GET" />
        <Form.Dropdown.Item title="POST" value="POST" />
        <Form.Dropdown.Item title="DELETE" value="DELETE" />
        <Form.Dropdown.Item title="PUT" value="PUT" />
      </Form.Dropdown>
    </Form>
  );
}
