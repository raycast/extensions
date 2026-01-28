import { Action, ActionPanel, Color, Form, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { MutatePromise, useCachedPromise } from "@raycast/utils";

interface UpdateIncidentResponse {
  incident: IncidentItem;
}

interface ListIncidentsResponse {
  incidents: IncidentItem[];
  limit: number;
  offset: number;
  total: number | null;
  more: boolean;
}

interface GetMeResponse {
  user: { email: string };
}

interface GetMeError {
  error: string;
}
interface ErrorResponse {
  error: { message: string; code: number; errors: string[] };
}

type IncidentStatus = "triggered" | "acknowledged" | "resolved";
interface IncidentItem {
  id: string;
  status: IncidentStatus;
  title: string;
  summary: string;
  incident_number: number;
  created_at: string;
  urgency: "high" | "low";
  html_url: string;
}

type Filter = "all" | IncidentStatus;

const { apiKey } = getPreferenceValues<Preferences>();
const API_URL = "https://api.pagerduty.com";
const API_HEADERS = {
  Authorization: `Token token=${apiKey}`,
};
const PAGE_LIMIT = "25";
const makeRequest = async <T,>(endpoint: string, options?: RequestInit) => {
  const response = await fetch(API_URL + endpoint, {
    ...options,
    headers: {
      ...API_HEADERS,
      ...options?.headers,
    },
  });
  if (!response.headers.get("Content-Type")?.includes("json")) throw new Error(await response.text());
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResponse | GetMeError;
    if (typeof err.error === "string") throw new Error(err.error);
    throw new Error(`${err.error.message} reason: ${err.error.errors?.join(", ")}`);
  }
  return result as T;
};
const pagerDutyClient = {
  get: <T,>(endpoint: string) => makeRequest<T>(endpoint),
  post: <T,>(endpoint: string, options: RequestInit) => makeRequest<T>(endpoint, { ...options, method: "POST" }),
  put: <T,>(endpoint: string, options: RequestInit) => makeRequest<T>(endpoint, { ...options, method: "PUT" }),
};

export default function Command() {
  const [filter, setFilter] = useState<Filter>("all");

  const {
    isLoading,
    data: incidents,
    pagination,
    mutate,
  } = useCachedPromise(
    () => async (options) => {
      const data = await pagerDutyClient.get<ListIncidentsResponse>(
        "/incidents?" +
          new URLSearchParams({
            sort_by: "created_at:desc",
            limit: PAGE_LIMIT,
            offset: String(options.page * +PAGE_LIMIT),
          }),
      );
      return {
        data: data.incidents,
        hasMore: data.more,
      };
    },
    [],
    { initialData: [] },
  );

  const filteredIncidents = filter === "all" ? incidents : incidents.filter((item) => item.status === filter);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Incidents by Status" onChange={(value) => setFilter(value as Filter)}>
          <List.Dropdown.Item title="All" value={"all"} />
          <List.Dropdown.Item title="Triggered" value={"triggered"} />
          <List.Dropdown.Item title="Acknowledged" value={"acknowledged"} />
          <List.Dropdown.Item title="Resolved" value={"resolved"} />
        </List.Dropdown>
      }
      pagination={pagination}
    >
      {filteredIncidents.map((incident) => (
        <List.Item
          key={incident.id}
          title={`#${incident.incident_number}: ${incident.title}`}
          accessories={[
            {
              text: format(parseISO(incident.created_at), "yyyy/MM/dd HH:mm:ss"),
            },
          ]}
          actions={
            <ActionPanel title={incident.title}>
              <ActionPanel.Section>
                <Action.OpenInBrowser
                  url={incident.html_url}
                  title="Open Incident in Browser"
                  shortcut={{ key: "enter", modifiers: [] }}
                />
                <Action.CopyToClipboard
                  content={incident.html_url}
                  title="Copy Link to Clipboard"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel.Section>
              {incident.status === "resolved" ? (
                <></>
              ) : (
                <ActionPanel.Section>
                  <UpdateIncidentStatusAction item={incident} mutateIncidents={mutate} />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
          icon={{
            source: {
              resolved: Icon.CheckCircle,
              acknowledged: Icon.Alarm,
              triggered: Icon.AlarmRinging,
            }[incident.status],
            tintColor: {
              resolved: Color.Green,
              acknowledged: Color.Yellow,
              triggered: Color.Red,
            }[incident.status],
          }}
        ></List.Item>
      ))}
    </List>
  );
}

function UpdateIncidentStatusAction(props: { item: IncidentItem; mutateIncidents: MutatePromise<IncidentItem[]> }) {
  async function onUpdateIncidentStatus(
    item: IncidentItem,
    newStatus: IncidentStatus,
    note: string | undefined = undefined,
  ) {
    const toast = await showToast(Toast.Style.Animated, "Updating...", "Getting user info");

    try {
      const me = await pagerDutyClient.get<GetMeResponse>("/users/me");
      if (note) {
        toast.message = "Adding note";
        await pagerDutyClient.post(`/incidents/${item.id}/notes`, {
          headers: { from: me.user.email },
          body: JSON.stringify({
            note: { content: note },
          }),
        });
      }
      toast.message = "Updating incident";
      await props.mutateIncidents(
        pagerDutyClient.put<UpdateIncidentResponse>(`/incidents/${item.id}`, {
          headers: { from: me.user.email },
          body: JSON.stringify({
            incident: {
              type: "incident",
              status: newStatus,
            },
          }),
        }),
        {
          optimisticUpdate(data) {
            return data.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i));
          },
        },
      );

      toast.style = Toast.Style.Success;
      toast.title = `Incident #${item.incident_number} has been ${newStatus}.`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `${error}`;
    }
  }

  const resolveAction = (
    <Action.Push
      key={props.item.id}
      icon={Icon.Checkmark}
      title={"Resolve Incident"}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      target={<ResolveIcidentForm onSubmit={(note) => onUpdateIncidentStatus(props.item, "resolved", note)} />}
    />
  );

  const acknowledgeAction = (
    <Action
      title={"Acknowledge Incident"}
      icon={Icon.Clock}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={() => onUpdateIncidentStatus(props.item, "acknowledged")}
    />
  );

  if (props.item.status === "resolved") {
    return <></>;
  } else if (props.item.status === "acknowledged") {
    return resolveAction;
  } else {
    return (
      <>
        {acknowledgeAction}
        {resolveAction}
      </>
    );
  }
}

function ResolveIcidentForm(props: { onSubmit: (note: string | undefined) => void }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Text}
            title="Resolve Incident"
            onSubmit={(values) => props.onSubmit(values.note)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="note"
        title="Resolution Note"
        placeholder="(Optional) Put some note to describe what you did to resolve this incident."
      />
    </Form>
  );
}
