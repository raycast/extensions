import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { DASHBOARD_URL, fetchFlags, fetchWebsites } from "./api";
import type { Website } from "./types";
import { FlagItem } from "./components/flags/flag-item";

export default function Command() {
  const { data: websites, isLoading: loadingWebsites, error: websitesError } = useCachedPromise(fetchWebsites);
  const [websiteId, setWebsiteId] = useState<string>("");

  const selectedId = websiteId || websites?.[0]?.id || "";
  const {
    data: flags,
    isLoading: loadingFlags,
    error: flagsError,
    revalidate,
  } = useCachedPromise(fetchFlags, [selectedId], {
    execute: selectedId.length > 0,
    keepPreviousData: true,
  });

  const error = websitesError || flagsError;

  if (error) {
    const isAuth = error.message.includes("Invalid API key");
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={isAuth ? "Invalid API Key" : "Failed to Load Flags"}
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
      isLoading={loadingWebsites || loadingFlags}
      isShowingDetail
      searchBarPlaceholder="Search flags..."
      searchBarAccessory={
        <List.Dropdown tooltip="Website" value={selectedId} onChange={(v) => setWebsiteId(v)}>
          {websites?.map((site: Website) => (
            <List.Dropdown.Item key={site.id} title={`${site.name} (${site.domain})`} value={site.id} />
          ))}
        </List.Dropdown>
      }
    >
      {flags?.length === 0 && (
        <List.EmptyView
          icon={Icon.LightBulb}
          title="No Feature Flags"
          description="Create a feature flag to start managing rollouts."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Create in Dashboard" url={DASHBOARD_URL} icon={Icon.Plus} />
            </ActionPanel>
          }
        />
      )}
      {flags?.map((flag) => (
        <FlagItem key={flag.id} flag={flag} onMutate={revalidate} />
      ))}
    </List>
  );
}
