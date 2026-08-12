import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { type DatePreset, DASHBOARD_URL, DATE_PRESETS, fetchLinks } from "./api";
import { LinkItem } from "./components/links/link-item";

export default function Command() {
  const [preset, setPreset] = useState<DatePreset>("last_30d");
  const { data: links, isLoading, error, revalidate } = useCachedPromise(fetchLinks);

  if (error) {
    const isAuth = error.message.includes("Invalid API key");
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={isAuth ? "Invalid API Key" : "Failed to Load Links"}
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
      searchBarPlaceholder="Search links..."
      searchBarAccessory={
        <List.Dropdown tooltip="Date Range" value={preset} onChange={(v) => setPreset(v as DatePreset)}>
          {DATE_PRESETS.map((p) => (
            <List.Dropdown.Item key={p.value} title={p.label} value={p.value} />
          ))}
        </List.Dropdown>
      }
    >
      {links?.length === 0 && (
        <List.EmptyView
          icon={Icon.Link}
          title="No Links"
          description="Create a short link to start tracking clicks."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Create in Dashboard" url={DASHBOARD_URL} icon={Icon.Plus} />
            </ActionPanel>
          }
        />
      )}
      {links?.map((link) => (
        <LinkItem key={link.id} link={link} preset={preset} onMutate={revalidate} />
      ))}
    </List>
  );
}
