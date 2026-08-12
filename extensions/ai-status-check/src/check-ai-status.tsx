import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useProviderStatuses } from "./hooks/use-provider-statuses";
import { getEnabledProviders, type ProviderPreferences } from "./providers/registry";
import { buildProviderSections, unavailableProviderRecord } from "./providers/provider-sections";
import { ProviderListItem } from "./components/provider-list-item";

export default function CheckAiStatusCommand() {
  const preferences = getPreferenceValues<ProviderPreferences>();
  const enabledProviders = getEnabledProviders(preferences);
  const { records, isRefreshing, isInitialLoading, refreshAll, refreshProvider } =
    useProviderStatuses(enabledProviders);
  const sections = buildProviderSections(enabledProviders, records);

  async function refreshAllWithFeedback() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing AI provider status" });
    const results = await refreshAll(true);
    const failures = results.filter((record) => record.refreshState === "failed").length;

    toast.style = failures > 0 ? Toast.Style.Failure : Toast.Style.Success;
    toast.title =
      failures > 0 ? `Refreshed with ${failures} failure${failures === 1 ? "" : "s"}` : "AI status refreshed";
    toast.message = failures > 0 ? `${results.length - failures} of ${results.length} providers updated` : undefined;
  }

  if (enabledProviders.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Gear}
          title="No Providers Enabled"
          description="Enable at least one AI provider in the extension preferences."
          actions={
            <ActionPanel>
              <Action title="Configure Providers" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isRefreshing} searchBarPlaceholder="Search providers or components">
      {isInitialLoading
        ? null
        : sections.map((section) => (
            <List.Section key={section.id} title={section.title}>
              {section.providers.map((provider) => (
                <ProviderListItem
                  key={provider.id}
                  provider={provider}
                  record={records[provider.id] ?? unavailableProviderRecord(provider.id)}
                  onRefreshAll={refreshAllWithFeedback}
                  onRefreshProvider={refreshProvider}
                />
              ))}
            </List.Section>
          ))}
    </List>
  );
}
