import {
  Action,
  ActionPanel,
  Color,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import axios from "axios";
import { setTimeout } from "timers/promises";

interface Preference {
  apiKey: string | null | undefined;
}

interface UpdateIncidentResponse {
  incident: IncidentItem;
}

interface ListIncidentsResponse {
  incidents: IncidentItem[];
}

interface GetMeResponse {
  user: { email: string };
}

interface GetMeError {
  error: string;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isGetMeError(e: any): e is GetMeError {
  return e !== null && typeof e.error === "string";
}

interface ErrorResponse {
  error: { message: string; code: number; errors: string[] };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isErrorResponse(e: any): e is ErrorResponse {
  return (
    e !== null &&
    e !== null &&
    e.error === "object" &&
    typeof e.error.message === "string" &&
    typeof e.error.code === "number" &&
    typeof e.error.errors === "object"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildErrorMessage(error: any): string {
  if (axios.isAxiosError(error) && isErrorResponse(error.response?.data)) {
    const response = error.response?.data as ErrorResponse;
    return `${response.error.message} reason: ${response.error.errors?.join(", ")}`;
  } else if (axios.isAxiosError(error) && isGetMeError(error.response?.data)) {
    return (error.response?.data as GetMeError).error;
  } else {
    console.log(error);
    return "Failed to update incident.";
  }
}

type IncidentStatus = "triggered" | "acknowledged" | "resolved";

interface IncidentItem {
  id: string;
  status: "triggered" | "acknowledged" | "resolved";
  title: string;
  summary: string;
  incident_number: number;
  created_at: string;
  urgency: "high" | "low";
  html_url: string;
}

type Filter = "all" | IncidentStatus;

interface State {
  items?: IncidentItem[];
  filter?: Filter;
  error?: Error;
}

const pagerDutyClient = (() => {
  const preference = getPreferenceValues<Preference>();
  return axios.create({
    baseURL: "https://api.pagerduty.com",
    headers: {
      Authorization: `Token token=${preference.apiKey}`,
    },
  });
})();

export default function Command() {
  const [state, setState] = useState<State>({});
  const { pop } = useNavigation();

  const filterIncidents = useCallback(() => {
    if (state.filter === undefined || state.filter === "all") {
      return state.items;
    } else {
      return state.items?.filter((item) => item.status === state.filter);
    }
  }, [state.items, state.filter]);

  async function updateIncident(id: string, newStatus: IncidentStatus) {
    const items = state.items ?? [];
    const index = items.findIndex((i) => i.id === id);
    if (index < 0) {
      showToast(Toast.Style.Failure, "Failed to update incident status.");
      return;
    }

    items[index].status = newStatus;
    setState({ items: items });

    if (newStatus === "resolved") {
      await setTimeout(600);
      pop();
    }
  }

  useEffect(() => {
    async function fetchIncidents() {
      try {
        const { data: response } = await pagerDutyClient.get<ListIncidentsResponse>("/incidents", {
          params: {
            sort_by: "created_at:desc",
          },
        });
        setState({ items: response.incidents });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }
    fetchIncidents();
  }, []);

  if (state.error) {
    showToast(Toast.Style.Failure, state.error.message);
  }

  return (
    <List
      isLoading={!state.items && !state.error}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Incidents by Status"
          value={state.filter}
          onChange={(newValue) => setState((previous) => ({ ...previous, filter: newValue as Filter }))}
        >
          <List.Dropdown.Item title="All" value={"all"} />
          <List.Dropdown.Item title="Triggered" value={"triggered"} />
          <List.Dropdown.Item title="Acknowledged" value={"acknowledged"} />
          <List.Dropdown.Item title="Resolved" value={"resolved"} />
        </List.Dropdown>
      }
    >
      {filterIncidents()?.map((incident) => (
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
                  <UpdateIncidentStatusAction item={incident} onUpdate={updateIncident} />
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

function UpdateIncidentStatusAction(props: {
  item: IncidentItem;
  onUpdate: (id: string, newStatus: IncidentStatus) => void;
}) {
  async function onUpdateIncidentStatus(
    item: IncidentItem,
    newStatus: IncidentStatus,
    note: string | undefined = undefined
  ) {
    showToast(Toast.Style.Animated, "Updating...");

    try {
      const { data: me } = await pagerDutyClient.get<GetMeResponse>("/users/me");
      if (note) {
        await pagerDutyClient.post(
          `/incidents/${item.id}/notes`,
          { note: { content: note } },
          { headers: { from: me.user.email } }
        );
      }
      const { data: updated } = await pagerDutyClient.put<UpdateIncidentResponse>(
        `/incidents/${item.id}`,
        {
          incident: {
            type: "incident",
            status: newStatus,
          },
        },
        { headers: { from: me.user.email } }
      );

      showToast(
        Toast.Style.Success,
        `Incident #${updated.incident.incident_number} has been ${updated.incident.status}.`
      );
      props.onUpdate(item.id, updated.incident.status);
    } catch (error) {
      const message = buildErrorMessage(error);
      showToast(Toast.Style.Failure, message);
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
