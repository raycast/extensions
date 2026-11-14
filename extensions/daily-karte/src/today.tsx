import { showFailureToast } from "@raycast/utils";
import { Action, ActionPanel, Icon, Keyboard, LaunchType, List, launchCommand } from "@raycast/api";
import { useState } from "react";
import { dateKey, formatDuration } from "daily-karte";
import { getSession, withGoogleAccess } from "./auth";
import { FirestoreClient } from "./lib/firestore";
import { activityIcon, ErrorView, useLoad } from "./components";
import { markdownText, todayPresentation } from "./lib/presentation";
import { EntryItem } from "./entry-item";

async function loadToday() {
  const session = await getSession();
  const day = dateKey();
  return {
    session,
    ...todayPresentation(await new FirestoreClient(session).day(day), day),
  };
}

function Today() {
  const [view, setView] = useState("timeline");
  const [search, setSearch] = useState("");
  const state = useLoad(loadToday);
  if (state.error) return <ErrorView error={state.error} refresh={state.refresh} />;
  const value = state.value;
  const sharedActions = (
    <>
      <Action
        title="Record Activity"
        icon={Icon.Plus}
        onAction={async () => {
          try {
            await launchCommand({ name: "record-activity", type: LaunchType.UserInitiated });
          } catch (error) {
            await showFailureToast(error, { title: "Could Not Open Record Activity" });
          }
        }}
      />
      {value && <Action.OpenInBrowser title="Open Daily Karte" url={value.session.config.website} />}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={value ? Keyboard.Shortcut.Common.Refresh : undefined}
        onAction={state.refresh}
      />
    </>
  );
  return (
    <List
      isLoading={state.loading}
      isShowingDetail
      filtering
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder={view === "timeline" ? "Search today's records…" : "Search today's activities…"}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Choose Today's View"
          id="today-view"
          defaultValue="timeline"
          storeValue
          onChange={(next) => {
            setSearch("");
            setView(next === "activity" ? "activity" : "timeline");
          }}
        >
          <List.Dropdown.Item title="By Activity" value="activity" icon={Icon.Stars} />
          <List.Dropdown.Item title="Timeline" value="timeline" icon={Icon.Clock} />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={value?.entries.length === 0 ? "No Activities Today" : "No Matching Results"}
        actions={<ActionPanel>{sharedActions}</ActionPanel>}
      />
      {value && (
        <>
          {view === "activity" && (
            <List.Section
              title="By Activity"
              subtitle={`${value.summary.count} records · ${formatDuration(value.summary.totalMinutes)}`}
            >
              {value.summary.byActivity.map((activity, index) => (
                <List.Item
                  key={index}
                  id={`activity-${index}`}
                  title={activity.name}
                  icon={activityIcon(activity)}
                  subtitle={formatDuration(activity.minutes)}
                  detail={
                    <List.Item.Detail
                      markdown={`# ${markdownText(activity.name)}\n\nThis activity appears in ${activity.count} ${activity.count === 1 ? "record" : "records"} ending today.`}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Records" text={String(activity.count)} />
                          <List.Item.Detail.Metadata.Label
                            title="Estimated Duration"
                            text={formatDuration(activity.minutes)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Share of Recorded Duration"
                            text={
                              value.summary.totalMinutes
                                ? `${Math.round((activity.minutes / value.summary.totalMinutes) * 100)}%`
                                : "No timed records"
                            }
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={<ActionPanel>{sharedActions}</ActionPanel>}
                />
              ))}
            </List.Section>
          )}
          {view === "timeline" && (
            <List.Section
              title="Timeline"
              subtitle={`${value.entries.length} records · ${formatDuration(value.summary.totalMinutes)}`}
            >
              {value.entries.map((entry) => (
                <EntryItem
                  key={entry.id}
                  entry={entry}
                  uid={value.session.uid}
                  projectId={value.session.config.projectId}
                  onSaved={state.refresh}
                  sharedActions={sharedActions}
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

export default withGoogleAccess(Today);
