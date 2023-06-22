import { ActionPanel, getPreferenceValues, Icon, List, Action, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";

import { Preferences } from "./preferences";
import { useDebounce } from "./useDebounce";

const preferences: Preferences = getPreferenceValues();

const AlertList = () => {
  const [query, setQuery] = useState(preferences.alertsQuery);
  const debouncedQuery = useDebounce<string>(query, 1000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const setSearchText = (text: string) => {
    setQuery(text);
  };

  const fetch = async (query: string) => {
    setIsLoading(true);
    setAlerts(await fetchAlerts(query));
    setIsLoading(false);
  };

  useEffect(() => {
    fetch(debouncedQuery);
  }, [debouncedQuery]);

  return (
    <List
      searchText={query}
      onSearchTextChange={setSearchText}
      enableFiltering={false}
      isLoading={isLoading}
      searchBarPlaceholder="Filter alerts..."
    >
      {alerts.map((alert) => (
        <AlertListItem key={alert.id} alert={alert} />
      ))}
    </List>
  );
};

export default AlertList;

const AlertListItem = (props: { alert: Alert; goBackToSavedSearches?: () => Promise<void> }) => {
  const goBackToSavedSearches = props.goBackToSavedSearches;
  const alert = props.alert;

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
      accessoryTitle={`${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString()}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`${preferences.url}/alert/detail/${alert.id}/details`} />
          <Action title="Acknowledge" icon={Icon.CheckCircle} onAction={() => acknowledgedAlert(alert.id)} />
          <Action title="Close" icon={Icon.XMarkCircle} onAction={() => closeAlert(alert.id)} />
          <Action title="Snooze for 1 Hour" icon={Icon.BellDisabled} onAction={() => snoozeAlert(alert.id, 1)} />
          <Action title="Snooze for 1 Day" icon={Icon.BellDisabled} onAction={() => snoozeAlert(alert.id, 24)} />
          <Action title="Snooze for 1 Week" icon={Icon.BellDisabled} onAction={() => snoozeAlert(alert.id, 168)} />
          {goBackToSavedSearches && (
            <Action title="Show Saved Searches" icon={Icon.List} onAction={() => goBackToSavedSearches()} />
          )}
        </ActionPanel>
      }
    />
  );
};

const fetchAlerts = async (query: string): Promise<Alert[]> => {
  try {
    const response = await fetch(
      `${preferences.apiUrl}/v2/alerts?query=${encodeURIComponent(query)}&limit=100&sort=createdAt&order=desc`,
      {
        headers: {
          Authorization: `GenieKey ${preferences.apiKey}`,
        },
      }
    );

    const json = await response.json();

    if (response.status >= 200 && response.status < 300) {
      if ((json as Record<string, unknown>).data) {
        return (json as Record<string, unknown>).data as Alert[];
      }

      return [];
    } else {
      if ((json as Record<string, string>).message) throw new Error((json as Record<string, string>).message);
      throw new Error("An unknown error occurred");
    }
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, `Could not load alerts: ${error.message}`);
    return Promise.resolve([]);
  }
};

const acknowledgedAlert = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${preferences.apiUrl}/v2/alerts/${id}/acknowledge`, {
      method: "post",
      headers: {
        Authorization: `GenieKey ${preferences.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: preferences.username,
      }),
    });

    const json = await response.json();

    if (response.status >= 200 && response.status < 300) {
      showToast(Toast.Style.Success, "Alert was acknowledged");
      return;
    } else {
      if ((json as Record<string, string>).message) throw new Error((json as Record<string, string>).message);
      throw new Error("An unknown error occurred");
    }
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, `Could not acknowledge alert: ${error.message}`);
    return;
  }
};

const closeAlert = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${preferences.apiUrl}/v2/alerts/${id}/close`, {
      method: "post",
      headers: {
        Authorization: `GenieKey ${preferences.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: preferences.username,
      }),
    });

    const json = await response.json();

    if (response.status >= 200 && response.status < 300) {
      showToast(Toast.Style.Success, "Alert was closed");
      return;
    } else {
      if ((json as Record<string, string>).message) throw new Error((json as Record<string, string>).message);
      throw new Error("An unknown error occurred");
    }
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, `Could not close alert: ${error.message}`);
    return;
  }
};

const snoozeAlert = async (id: string, hours: number): Promise<void> => {
  try {
    const now = new Date();
    const endTime = new Date();
    endTime.setHours(now.getHours() + hours);

    const response = await fetch(`${preferences.apiUrl}/v2/alerts/${id}/snooze`, {
      method: "post",
      headers: {
        Authorization: `GenieKey ${preferences.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endTime: endTime,
        user: preferences.username,
      }),
    });

    const json = await response.json();

    if (response.status >= 200 && response.status < 300) {
      showToast(Toast.Style.Success, "Alert was snoozed");
      return;
    } else {
      if ((json as Record<string, string>).message) throw new Error((json as Record<string, string>).message);
      throw new Error("An unknown error occurred");
    }
  } catch (error) {
    console.error(error);
    showToast(Toast.Style.Failure, `Could not snooze alert: ${error.message}`);
    return;
  }
};

export type Alert = {
  id: string;
  message: string;
  status: string;
  acknowledged: boolean;
  snoozed: boolean;
  tags: string[];
  createdAt: string;
  priority: string;
};
