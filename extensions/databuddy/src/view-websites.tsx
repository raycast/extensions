import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { type DatePreset, DASHBOARD_URL, DATE_PRESETS, fetchWebsites } from "./api";
import { WebsiteItem } from "./components/websites/website-item";

export default function Command() {
  const [preset, setPreset] = useState<DatePreset>("last_30d");
  const { data: websites, isLoading, error, revalidate } = useCachedPromise(fetchWebsites);

  if (error) {
    const isAuth = error.message.includes("Invalid API key");
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={isAuth ? "Invalid API Key" : "Failed to Load Websites"}
          description={isAuth ? "Check your API key in extension preferences." : error.message}
          actions={
            <ActionPanel>
              {isAuth && <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />}
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search websites..."
      searchBarAccessory={
        <List.Dropdown tooltip="Date Range" value={preset} onChange={(v) => setPreset(v as DatePreset)}>
          {DATE_PRESETS.map((p) => (
            <List.Dropdown.Item key={p.value} title={p.label} value={p.value} />
          ))}
        </List.Dropdown>
      }
    >
      {websites?.length === 0 && (
        <List.EmptyView
          icon={Icon.Globe}
          title="No Websites"
          description="Create a website to start tracking analytics."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Create in Dashboard" url={DASHBOARD_URL} icon={Icon.Plus} />
            </ActionPanel>
          }
        />
      )}
      {websites?.map((site) => (
        <WebsiteItem key={site.id} site={site} preset={preset} onMutate={revalidate} />
      ))}
    </List>
  );
}
