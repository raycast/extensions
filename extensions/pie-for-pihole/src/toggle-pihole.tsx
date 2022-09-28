import { List, Toast, showToast, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { SummaryInfo } from "./interfaces";
import { cleanPiholeURL, fetchRequestTimeout } from "./utils";

function piholeToggle(action: string, duration?: number) {
  const { PIHOLE_URL, API_TOKEN } = getPreferenceValues();
  showToast({ style: Toast.Style.Animated, title: action == "enable" ? "Enabling pihole..." : "Disabling pihole..." });
  const disableDuration = duration == undefined ? "" : `=${duration}`;
  fetch(`http://${cleanPiholeURL(PIHOLE_URL)}/admin/api.php?${action}${disableDuration}&auth=${API_TOKEN}`).then(
    (res) => {
      if (res.ok) {
        showToast({
          style: Toast.Style.Success,
          title: action == "enable" ? "Pihole enabled!" : "Pihole disabled!",
        });
      }
    }
  );
}

export default function () {
  const { PIHOLE_URL } = getPreferenceValues();
  const [currentStatus, updateCurrentStatus] = useState<string>();
  const [timeoutInfo, updateTimeoutInfo] = useState<string>();

  useEffect(() => {
    async function getStatus() {
      const response = await fetchRequestTimeout(`http://${cleanPiholeURL(PIHOLE_URL)}/admin/api.php?summary`);
      if (response == "query-aborted" || response == undefined) {
        updateTimeoutInfo("query-aborted");
      } else {
        const data = (await response!.json()) as SummaryInfo;
        updateTimeoutInfo("no-timeout");
        updateCurrentStatus(data.status);
      }
    }
    getStatus();
  }, [currentStatus]);
  return timeoutInfo === "query-aborted" ? (
    <List>
      <List.Item
        key={"validation error"}
        title={`Invalid Pi-Hole URL or API token has been provided`}
        accessories={[{ text: "Please check extensions -> Pie for Pi-hole " }]}
      />
    </List>
  ) : (
    <List isLoading={currentStatus == undefined ? true : false}>
      <List.Section title="Current Pi-Hole status">
        <List.Item
          key="Current status"
          title={currentStatus ?? "unknown"}
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
        />
      </List.Section>

      <List.Section title="Pi-hole toggle options">
        {currentStatus == "enabled" ? (
          <>
            <List.Item
              key="disable"
              title="Disable indefinitely"
              icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Disable indefinitely" onAction={() => piholeToggle("disable")} />
                </ActionPanel>
              }
            />
            <List.Item
              key="disable1min"
              title="Disable for 1 minute"
              icon={{ source: Icon.Clock, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Disable for 1 minute" onAction={() => piholeToggle("disable", 60)} />
                </ActionPanel>
              }
            />
            <List.Item
              key="disable5min"
              title="Disable for 5 minutes"
              icon={{ source: Icon.Clock, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Disable for 5 minutes" onAction={() => piholeToggle("disable", 300)} />
                </ActionPanel>
              }
            />
            <List.Item
              key="disable15min"
              title="Disable for 15 minutes"
              icon={{ source: Icon.Clock, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Disable for 15 minutes" onAction={() => piholeToggle("disable", 900)} />
                </ActionPanel>
              }
            />
            <List.Item
              key="disable1hour"
              title="Disable for 1 hour"
              icon={{ source: Icon.Clock, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action title="Disable for 1 hour" onAction={() => piholeToggle("disable", 3600)} />
                </ActionPanel>
              }
            />
          </>
        ) : (
          <List.Item
            key="enable"
            title="Enable Pi-Hole"
            icon={{ source: Icon.Clock, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action title="Enable Pi-Hole" onAction={() => piholeToggle("enable")} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
