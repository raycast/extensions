import { ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
import React from "react";
import { Preferences } from "./types/preferences";
import { ActionOpenCommandPreferences } from "./components/action-open-command-preferences";
import { checkNetworkSpeed } from "./hooks/hooks";
import { ActionOpenNetworkSpeed } from "./components/action-open-network-speed";

export default function Command() {
  const { testSequentially } = getPreferenceValues<Preferences>();
  const { networkSpeedInfo, networkSpeed, networkSpeedLoading, testTime, loading } =
    checkNetworkSpeed(testSequentially);

  return (
    <List searchBarPlaceholder="Search network speed info" filtering={false}>
      <List.EmptyView
        icon={"loading/loading.gif"}
        title={loading ? "Testing Your Connection..." : "No info"}
        description={loading ? networkSpeedLoading : ""}
        actions={
          <ActionPanel>
            <ActionOpenCommandPreferences />
          </ActionPanel>
        }
      />

      {!loading && (
        <List.Section title={"Time Cost"} subtitle={testTime + "s"}>
          <List.Item
            title={{ value: "Downlink", tooltip: "Downlink Capacity" }}
            icon={{ source: Icon.Download, tintColor: Color.Blue }}
            subtitle={networkSpeed?.downloadCapacity}
            actions={
              <ActionPanel>
                <ActionOpenNetworkSpeed value={networkSpeedInfo} />
              </ActionPanel>
            }
          />
          <List.Item
            title={{ value: "Uplink", tooltip: "Uplink Capacity" }}
            icon={{ source: Icon.Upload, tintColor: Color.Red }}
            subtitle={networkSpeed?.uploadCapacity}
            actions={
              <ActionPanel>
                <ActionOpenNetworkSpeed value={networkSpeedInfo} />
              </ActionPanel>
            }
          />
          {!testSequentially && (
            <List.Item
              title={{ value: "RPM", tooltip: "Responsiveness" }}
              icon={{ source: Icon.Switch, tintColor: Color.Yellow }}
              subtitle={networkSpeed?.responsiveness}
              actions={
                <ActionPanel>
                  <ActionOpenNetworkSpeed value={networkSpeedInfo} />
                </ActionPanel>
              }
            />
          )}
          {testSequentially && (
            <>
              <List.Item
                title={{ value: "RPM", tooltip: "Downlink Responsiveness" }}
                icon={{ source: Icon.ArrowDown, tintColor: Color.Green }}
                subtitle={networkSpeed?.downloadResponsiveness}
                actions={
                  <ActionPanel>
                    <ActionOpenNetworkSpeed value={networkSpeedInfo} />
                  </ActionPanel>
                }
              />
              <List.Item
                title={{ value: "RPM", tooltip: "Uplink Responsiveness" }}
                icon={{ source: Icon.ArrowUp, tintColor: Color.Orange }}
                subtitle={networkSpeed?.uploadResponsiveness}
                actions={
                  <ActionPanel>
                    <ActionOpenNetworkSpeed value={networkSpeedInfo} />
                  </ActionPanel>
                }
              />
            </>
          )}
          {networkSpeed?.hasIdleLatency && (
            <List.Item
              title={{ value: "Latency", tooltip: "Idle Latency" }}
              icon={{ source: Icon.Heartbeat, tintColor: Color.Purple }}
              subtitle={networkSpeed?.idleLatency}
              actions={
                <ActionPanel>
                  <ActionOpenNetworkSpeed value={networkSpeedInfo} />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}
