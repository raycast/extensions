import { ActionPanel, getPreferenceValues, Icon, List, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";

import { MutatePromise, useFetch } from "@raycast/utils";
import { Alert, ErrorResult, PaginatedResult, Result } from "./types";

const preferences = getPreferenceValues<Preferences>();

const AlertList = () => {
  const [query, setQuery] = useState(preferences.alertsQuery);

  const setSearchText = (text: string) => {
    setQuery(text);
  };

  const {
    isLoading,
    data: alerts,
    mutate,
  } = useFetch(
    `${preferences.apiUrl}/v2/alerts?query=${encodeURIComponent(query)}&limit=100&sort=createdAt&order=desc`,
    {
      headers: {
        Authorization: `GenieKey ${preferences.apiKey}`,
      },
      async parseResponse(response) {
        const result = (await response.json()) as ErrorResult | PaginatedResult<Alert>;
        if ("message" in result) throw new Error(result.message);
        if (!response.ok) throw new Error("An unknown error occurred");
        return result.data;
      },
      initialData: [],
      failureToastOptions: {
        title: "Could not load alerts",
      },
    },
  );

  return (
    <List
      searchText={query}
      onSearchTextChange={setSearchText}
      filtering={false}
      isLoading={isLoading}
      searchBarPlaceholder="Filter alerts"
      throttle
    >
      {!isLoading && !alerts.length && (
        <>
          {query ? (
            <List.EmptyView
              icon="1628..svg"
              title="We couldn't find any matching alerts for this search."
              actions={
                <ActionPanel>
                  <Action title="View All Alerts" onAction={() => setQuery("")} />
                </ActionPanel>
              }
            />
          ) : (
            <List.EmptyView
              icon="6917..svg"
              title="You don't have any alerts yet"
              description="Alerts can be created manually, or triggered by integrations, emails, heartbeats, and more."
            />
          )}
        </>
      )}
      {alerts.map((alert) => (
        <AlertListItem key={alert.id} alert={alert} mutate={mutate} isLoading={isLoading} />
      ))}
    </List>
  );
};

export default AlertList;

const AlertListItem = (props: { alert: Alert; mutate: MutatePromise<Alert[]>; isLoading: boolean }) => {
  const alert = props.alert;
  const { mutate, isLoading } = props;

  const createdAt = new Date(alert.createdAt);
  const subtitle = alert.acknowledged
    ? "Acknowledged"
    : alert.snoozed
      ? "Snoozed"
      : alert.status === "closed"
        ? "Closed"
        : "Open";
  const icon =
    alert.priority === "P1"
      ? "icon-p1.png"
      : alert.priority === "P2"
        ? "icon-p2.png"
        : alert.priority === "P3"
          ? "icon-p3.png"
          : alert.priority === "P4"
            ? "icon-p4.png"
            : "icon-p5.png";

  return (
    <List.Item
      id={alert.id}
      key={alert.id}
      title={alert.message}
      subtitle={`${subtitle}${alert.tags && alert.tags.length > 0 ? ` [${alert.tags.join(", ")}]` : ""}`}
      icon={icon}
      keywords={[alert.status, alert.priority, ...alert.tags]}
      accessories={[{ text: `${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}` }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`${preferences.url}/alert/detail/${alert.id}/details`} />
          {!isLoading && (
            <>
              {alert.acknowledged ? (
                <Action
                  title="Unacknowledge"
                  icon={Icon.XMarkCircle}
                  onAction={() => unAcknowledgeAlert(alert.id, mutate)}
                />
              ) : (
                <Action
                  title="Acknowledge"
                  icon={Icon.CheckCircle}
                  onAction={() => acknowledgeAlert(alert.id, mutate)}
                />
              )}
              {alert.status !== "closed" && (
                <Action title="Close" icon={Icon.XMarkCircle} onAction={() => closeAlert(alert.id, mutate)} />
              )}
              <Action
                title="Snooze for 1 Hour"
                icon={Icon.BellDisabled}
                onAction={() => snoozeAlert(alert.id, 1, mutate)}
              />
              <Action
                title="Snooze for 1 Day"
                icon={Icon.BellDisabled}
                onAction={() => snoozeAlert(alert.id, 24, mutate)}
              />
              <Action
                title="Snooze for 1 Week"
                icon={Icon.BellDisabled}
                onAction={() => snoozeAlert(alert.id, 168, mutate)}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
};

const acknowledgeAlert = async (id: string, mutate: MutatePromise<Alert[]>): Promise<void> => {
  const toast = await showToast(Toast.Style.Animated, "Acknowledging alert");
  try {
    await mutate(
      fetch(`${preferences.apiUrl}/v2/alerts/${id}/acknowledge`, {
        method: "post",
        headers: {
          Authorization: `GenieKey ${preferences.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: preferences.username,
        }),
      }).then(async (response) => {
        const result = (await response.json()) as ErrorResult | Result;
        if ("message" in result) throw new Error(result.message);
        if (!response.ok) throw new Error("An unknown error occurred");
      }),
      {
        optimisticUpdate(data) {
          const index = data.findIndex((alert) => alert.id);
          data[index].acknowledged = true;
          return data;
        },
        shouldRevalidateAfter: false,
      },
    );

    toast.style = Toast.Style.Success;
    toast.title = "Alert was acknowledged";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not acknowledge alert";
    toast.message = (error as Error).message;
  }
};
const unAcknowledgeAlert = async (id: string, mutate: MutatePromise<Alert[]>): Promise<void> => {
  const toast = await showToast(Toast.Style.Animated, "UnAcknowledging alert");
  try {
    await mutate(
      fetch(`${preferences.apiUrl}/v2/alerts/${id}/unacknowledge`, {
        method: "post",
        headers: {
          Authorization: `GenieKey ${preferences.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: preferences.username,
        }),
      }).then(async (response) => {
        const result = (await response.json()) as ErrorResult | Result;
        if ("message" in result) throw new Error(result.message);
        if (!response.ok) throw new Error("An unknown error occurred");
      }),
      {
        optimisticUpdate(data) {
          const index = data.findIndex((alert) => alert.id);
          data[index].acknowledged = false;
          return data;
        },
        shouldRevalidateAfter: false,
      },
    );

    toast.style = Toast.Style.Success;
    toast.title = "Alert was unacknowledged";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not unacknowledge alert";
    toast.message = (error as Error).message;
  }
};

const closeAlert = async (id: string, mutate: MutatePromise<Alert[]>): Promise<void> => {
  const toast = await showToast(Toast.Style.Animated, "Closing alert");
  try {
    await mutate(
      fetch(`${preferences.apiUrl}/v2/alerts/${id}/close`, {
        method: "post",
        headers: {
          Authorization: `GenieKey ${preferences.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: preferences.username,
        }),
      }).then(async (response) => {
        const result = (await response.json()) as ErrorResult | Result;
        if ("message" in result) throw new Error(result.message);
        if (!response.ok) throw new Error("An unknown error occurred");
      }),
      {
        optimisticUpdate(data) {
          const index = data.findIndex((alert) => alert.id);
          data[index].status = "closed";
          return data;
        },
        shouldRevalidateAfter: false,
      },
    );
    toast.style = Toast.Style.Success;
    toast.title = "Alert was closed";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not close alert";
    toast.message = (error as Error).message;
  }
};

const snoozeAlert = async (id: string, hours: number, mutate: MutatePromise<Alert[]>): Promise<void> => {
  const toast = await showToast(Toast.Style.Animated, "Snoozing alert");
  try {
    const now = new Date();
    const endTime = new Date();
    endTime.setHours(now.getHours() + hours);

    await mutate(
      fetch(`${preferences.apiUrl}/v2/alerts/${id}/snooze`, {
        method: "post",
        headers: {
          Authorization: `GenieKey ${preferences.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endTime: endTime,
          user: preferences.username,
        }),
      }).then(async (response) => {
        const result = (await response.json()) as ErrorResult | Result;
        if ("message" in result) throw new Error(result.message);
        if (!response.ok) throw new Error("An unknown error occurred");
      }),
      {
        optimisticUpdate(data) {
          const index = data.findIndex((alert) => alert.id);
          data[index].snoozed = true;
          return data;
        },
        shouldRevalidateAfter: false,
      },
    );

    toast.style = Toast.Style.Success;
    toast.title = "Alert was snoozed";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not snooze alert";
    toast.message = (error as Error).message;
  }
};
