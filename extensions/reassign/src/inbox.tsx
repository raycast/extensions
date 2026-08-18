import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { AgendaNavActions } from "./components/agenda-actions";
import { BacklogScheduleForm } from "./components/backlog-schedule-form";
import { refusalView } from "./components/states";
import { getScheduleWithBacklog, manageBacklog } from "./lib/api";
import { runMutation } from "./lib/feedback";
import { humanHours, isIsoDate, relativeDayLabel, todayISO } from "./lib/format";
import { Area, ActivityType, areaActivityNames, BacklogItem, resolveActivity, resolveArea } from "./lib/schedule-model";
import { WEB_BASE } from "./lib/wire";

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  const { push } = useNavigation();
  const { data, isLoading, revalidate } = useCachedPromise(getScheduleWithBacklog, [todayISO()], {
    keepPreviousData: true,
  });

  // Place a parked item with the `schedule` op, then refresh the list.
  async function scheduleItem(id: string, date: string, start: string) {
    await runMutation("Scheduling…", "Scheduled the block", () => manageBacklog([{ op: "schedule", id, date, start }]));
    revalidate();
  }

  if (data && !data.ok) return refusalView(data, revalidate);

  const todayIso = data?.ok ? data.data.now.todayIso : todayISO();
  const areas = data?.ok ? (data.data.areas ?? []) : [];
  const activityTypes = data?.ok ? (data.data.activityTypes ?? []) : [];
  const items = data?.ok ? (data.data.backlog ?? []) : [];
  const isEmpty = items.length === 0;

  function nav() {
    return (
      <ActionPanel.Section title="Navigate">
        <AgendaNavActions
          showingDetail={showingDetail}
          onToggleDetail={() => setShowingDetail((on) => !on)}
          onRefresh={revalidate}
        />
      </ActionPanel.Section>
    );
  }

  function itemActions(item: BacklogItem) {
    return (
      <ActionPanel>
        <Action
          title="Schedule This Idea…"
          icon={Icon.Calendar}
          onAction={() =>
            push(<BacklogScheduleForm item={item} onSubmit={(date, start) => scheduleItem(item.id, date, start)} />)
          }
        />
        <Action.OpenInBrowser title="Open Reassign" url={WEB_BASE} />
        <Action
          title="Add Idea"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => launchCommand({ name: "add", type: LaunchType.UserInitiated })}
        />
        <Action
          title="Remove Idea"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            await runMutation("Removing…", "Removed the idea", () => manageBacklog([{ op: "remove", id: item.id }]));
            revalidate();
          }}
        />
        {nav()}
      </ActionPanel>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={!isEmpty && showingDetail}
      navigationTitle="Inbox"
      searchBarPlaceholder="Filter ideas by name, area, or activity"
    >
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={{ source: Icon.Tray, tintColor: itemColor(item, areas) }}
          title={item.name || "(untitled)"}
          subtitle={showingDetail ? backlogDurationLabel(item) : undefined}
          keywords={areaActivityNames(item, areas, activityTypes)}
          accessories={showingDetail ? undefined : accessories(item, areas, todayIso)}
          detail={
            showingDetail ? (
              <BacklogDetail item={item} areas={areas} activityTypes={activityTypes} todayIso={todayIso} />
            ) : undefined
          }
          actions={itemActions(item)}
        />
      ))}
      {isEmpty && (
        <List.EmptyView
          icon={Icon.Tray}
          title="Your Inbox is empty"
          description="Save an idea here now, and give it a time later."
          actions={
            <ActionPanel>
              <Action
                title="Add Idea"
                icon={Icon.Plus}
                onAction={() => launchCommand({ name: "add", type: LaunchType.UserInitiated })}
              />
              <Action
                title="Open Agenda"
                icon={Icon.List}
                onAction={() => launchCommand({ name: "agenda", type: LaunchType.UserInitiated })}
              />
              {nav()}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

/** The right-hand pane: notes plus a duration / planned-date / area table. */
function BacklogDetail(props: { item: BacklogItem; areas: Area[]; activityTypes: ActivityType[]; todayIso: string }) {
  const { item, areas, activityTypes, todayIso } = props;
  const title = item.name || "(untitled)";
  const notes = typeof item.notes === "string" ? item.notes.trim() : "";
  const duration = backlogDurationLabel(item);
  const planned = plannedLabel(item, todayIso);
  const area = resolveArea(item, areas);
  const activity = resolveActivity(item, activityTypes);

  return (
    <List.Item.Detail
      markdown={`# ${title}${notes ? `\n\n${notes}` : ""}`}
      metadata={
        <List.Item.Detail.Metadata>
          {duration ? <List.Item.Detail.Metadata.Label title="Duration" text={duration} /> : null}
          {planned ? <List.Item.Detail.Metadata.Label title="Planned for" text={planned} /> : null}
          {area ? (
            <List.Item.Detail.Metadata.TagList title="Area">
              <List.Item.Detail.Metadata.TagList.Item text={area.name} color={area.color} />
            </List.Item.Detail.Metadata.TagList>
          ) : null}
          {activity ? <List.Item.Detail.Metadata.Label title="Activity" text={activity.name} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function accessories(item: BacklogItem, areas: Area[], todayIso: string): List.Item.Accessory[] {
  const out: List.Item.Accessory[] = [];
  const area = resolveArea(item, areas);
  if (area) out.push({ tag: { value: area.name, color: area.color } });
  const planned = plannedLabel(item, todayIso);
  if (planned) out.push({ icon: Icon.Calendar, tooltip: `Planned for ${planned}` });
  const duration = backlogDurationLabel(item);
  if (duration) out.push({ text: duration });
  return out;
}

/** A human duration from `durationHours`, or "" when it is absent or invalid. */
function backlogDurationLabel(item: BacklogItem): string {
  const hours = item.durationHours;
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0) return "";
  return humanHours(hours);
}

/** A friendly planned-date label, or "" when the field is absent or not a date. */
function plannedLabel(item: BacklogItem, todayIso: string): string {
  return isIsoDate(item.plannedDate) ? relativeDayLabel(item.plannedDate, todayIso) : "";
}

function itemColor(item: BacklogItem, areas: Area[]): Color | string {
  return resolveArea(item, areas)?.color ?? Color.SecondaryText;
}
