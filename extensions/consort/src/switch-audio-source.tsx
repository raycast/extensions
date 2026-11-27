import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { NotInstalledView } from "./components/NotInstalledView";
import { delay, formatActiveSourceSummary, readConsortState, runConsortAction } from "./lib/consort";

export default function SwitchAudioSourceCommand() {
  const { data: state, error, isLoading, revalidate } = usePromise(readConsortState);
  const [searchText, setSearchText] = useState("");

  if (!isLoading && state && !state.installed) {
    return <NotInstalledView />;
  }

  if (error && !state) {
    return (
      <List
        isLoading={isLoading}
        filtering={true}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Filter apps or type an app name / bundle ID..."
      >
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Unable to Read Consort State"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  async function selectSource(commandPath: string, label: string) {
    const ok = await runConsortAction(commandPath, { toastTitle: `Audio source set to ${label}` });
    if (ok) {
      await delay(250);
      await revalidate();
    }
  }

  const trimmedQuery = searchText.trim();
  const apps = state?.savedApps ?? [];
  const hasExactMatch = apps.some(
    (app) =>
      app.displayName.toLowerCase() === trimmedQuery.toLowerCase() ||
      app.bundleID.toLowerCase() === trimmedQuery.toLowerCase()
  );

  return (
    <List
      isLoading={isLoading}
      filtering={true}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter apps or type an app name / bundle ID..."
    >
      <List.Section title="System" subtitle={state ? `Current: ${formatActiveSourceSummary(state)}` : undefined}>
        <List.Item
          icon={Icon.Desktop}
          title="All Mac Audio"
          subtitle="Capture all system audio output"
          keywords={["system", "default", "mac", "all"]}
          accessories={
            state?.routingMode === "all" ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }] : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Route All Mac Audio"
                icon={Icon.Desktop}
                onAction={() => selectSource("source?mode=all", "All Mac Audio")}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Known Audio Apps">
        {apps.map((app) => {
          const isSelected = state?.routingMode === "selected" && state.selectedBundleIDs.includes(app.bundleID);
          return (
            <List.Item
              key={app.bundleID}
              icon={app.bundlePath ? { fileIcon: app.bundlePath } : Icon.AppWindow}
              title={app.displayName}
              subtitle={app.bundleID}
              keywords={[app.bundleID]}
              accessories={isSelected ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }] : []}
              actions={
                <ActionPanel>
                  <Action
                    title={`Route ${app.displayName}`}
                    icon={Icon.Music}
                    onAction={() => selectSource(`source?app=${encodeURIComponent(app.bundleID)}`, app.displayName)}
                  />
                </ActionPanel>
              }
            />
          );
        })}

        {trimmedQuery.length > 0 && !hasExactMatch ? (
          <List.Item
            icon={Icon.MagnifyingGlass}
            title={`Route "${trimmedQuery}"`}
            subtitle="Match by running app name or bundle ID"
            keywords={[trimmedQuery]}
            actions={
              <ActionPanel>
                <Action
                  title={`Route ${trimmedQuery}`}
                  icon={Icon.Music}
                  onAction={() => selectSource(`source?app=${encodeURIComponent(trimmedQuery)}`, trimmedQuery)}
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
    </List>
  );
}
