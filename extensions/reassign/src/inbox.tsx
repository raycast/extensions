import { Action, ActionPanel, Color, Icon, Image, Keyboard, launchCommand, LaunchType, List } from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { useRef, useState } from "react";
import { AgendaNavActions } from "./components/agenda-actions";
import { BacklogScheduleForm } from "./components/backlog-schedule-form";
import { refusalView } from "./components/states";
import { reassignProvider } from "./lib/oauth";
import { getScheduleWithBacklog, manageBacklog } from "./lib/api";
import { runMutation } from "./lib/feedback";
import { humanDuration, isIsoDate, relativeDayLabel, todayISO } from "./lib/format";
import {
  Area,
  ActivityType,
  areaActivityNames,
  BacklogItem,
  itemPriority,
  nowWallClock,
  priorityLabel,
  Project,
  resolveActivity,
  resolveArea,
  resolveProject,
} from "./lib/schedule-model";
import { type Priority, PRIORITIES_DESC, PRIORITY_LABELS, WEB_BASE } from "./lib/wire";

function Command() {
  const [showingDetail, setShowingDetail] = useState(true);
  // The lowest priority to show (0 = all). A new value reads the Inbox again from the first page.
  const [minPriority, setMinPriority] = useState("0");
  const { data, isLoading, revalidate } = useCachedPromise(getScheduleWithBacklog, [todayISO(), Number(minPriority)], {
    keepPreviousData: true,
  });

  // Place a parked item with the `schedule` op, then refresh the list.
  async function scheduleItem(id: string, start: string) {
    const result = await runMutation(
      "Scheduling…",
      "Scheduled the block",
      () => manageBacklog([{ op: "schedule", id, start }]),
      undefined,
      { onUndone: revalidate },
    );
    if (result.ok) revalidate();
    return result.ok;
  }

  // Send only the changed key: projectId null clears the project, priority 0 clears the priority.
  // A new project goes without an areaId, so the server gives the item the project area.
  async function updateItem(id: string, change: { projectId: string | null } | { priority: number }, done: string) {
    const result = await runMutation(
      "Saving…",
      done,
      () => manageBacklog([{ op: "update", id, ...change }]),
      undefined,
      { onUndone: revalidate },
    );
    if (result.ok) revalidate();
  }

  // Act on the last settled verdict: a cached refusal on mount can be stale, and a
  // shown refusal stays mounted during its own revalidate, so ReauthView does not sign in again.
  const refused = useRef(false);
  if (!isLoading) refused.current = Boolean(data && !data.ok);
  if (data && !data.ok && refused.current) {
    // A failed filtered read hides the dropdown, so offer the way back to all ideas.
    const showAll = minPriority !== "0" && (
      <Action title="Show All Ideas" icon={Icon.Filter} onAction={() => setMinPriority("0")} />
    );
    return refusalView(data, revalidate, showAll || undefined);
  }

  const todayIso = data?.ok ? nowWallClock(data.data.now).date : todayISO();
  const areas = data?.ok ? (data.data.areas ?? []) : [];
  const activityTypes = data?.ok ? (data.data.activityTypes ?? []) : [];
  const projects = data?.ok ? (data.data.projects ?? []) : [];
  // An archived project refuses a new link, so the menu offers only the live ones.
  const liveProjects = projects.filter((p) => !p.archived);
  const items = data?.ok ? (data.data.backlog ?? []) : [];
  const isEmpty = items.length === 0;
  // `backlogCount` counts the whole Inbox, so an empty Inbox is not a filter miss.
  const filterHidesAll = minPriority !== "0" && !(data?.ok && data.data.backlogCount === 0);

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
    const priority = itemPriority(item) ?? 0;
    return (
      <ActionPanel>
        <Action.Push
          title="Schedule This Idea…"
          icon={Icon.Calendar}
          target={
            <BacklogScheduleForm item={item} todayIso={todayIso} onSubmit={(start) => scheduleItem(item.id, start)} />
          }
        />
        <ActionPanel.Submenu title="Set Priority" icon={Icon.Flag} shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}>
          {PRIORITY_CHOICES.map(({ value, title }) => (
            <Action
              key={value}
              title={title}
              icon={value === priority ? Icon.Checkmark : priorityIcon(value)}
              onAction={() =>
                value === priority
                  ? undefined
                  : updateItem(item.id, { priority: value }, value ? "Set the priority" : "Cleared the priority")
              }
            />
          ))}
        </ActionPanel.Submenu>
        {liveProjects.length > 0 || item.projectId ? (
          <ActionPanel.Submenu
            title="Set Project"
            icon={Icon.Folder}
            shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
          >
            <Action
              title="No Project"
              icon={item.projectId ? Icon.Circle : Icon.Checkmark}
              onAction={() =>
                item.projectId ? updateItem(item.id, { projectId: null }, "Cleared the project") : undefined
              }
            />
            {liveProjects.map((project) => (
              <Action
                key={project.id}
                title={project.name}
                icon={project.id === item.projectId ? Icon.Checkmark : Icon.Folder}
                onAction={() =>
                  project.id === item.projectId
                    ? undefined
                    : updateItem(item.id, { projectId: project.id }, "Set the project")
                }
              />
            ))}
          </ActionPanel.Submenu>
        ) : null}
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
            const result = await runMutation(
              "Removing…",
              "Removed the idea",
              () => manageBacklog([{ op: "remove", id: item.id }]),
              undefined,
              { onUndone: revalidate },
            );
            if (result.ok) revalidate();
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
      searchBarPlaceholder="Filter ideas by name, area, activity, or project"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by priority" value={minPriority} onChange={setMinPriority}>
          {MIN_PRIORITY_CHOICES.map(({ value, title }) => (
            <List.Dropdown.Item key={value} title={title} value={String(value)} />
          ))}
        </List.Dropdown>
      }
    >
      {items.map((item) => (
        <List.Item
          key={item.id}
          icon={{ source: Icon.Tray, tintColor: itemColor(item, areas) }}
          title={item.name || "(untitled)"}
          subtitle={showingDetail ? backlogDurationLabel(item) : undefined}
          keywords={[...areaActivityNames(item, areas, activityTypes), ...projectNames(item, projects)]}
          accessories={showingDetail ? undefined : accessories(item, areas, projects, todayIso)}
          detail={
            showingDetail ? (
              <BacklogDetail
                item={item}
                areas={areas}
                activityTypes={activityTypes}
                projects={projects}
                todayIso={todayIso}
              />
            ) : undefined
          }
          actions={itemActions(item)}
        />
      ))}
      {isEmpty && (
        <List.EmptyView
          icon={Icon.Tray}
          title={filterHidesAll ? "No ideas have this priority" : "Your Inbox is empty"}
          description={
            filterHidesAll
              ? "Choose a lower priority in the filter."
              : "Save an idea here now, and give it a time later."
          }
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

export default withAccessToken(reassignProvider)(Command);

/** The right-hand pane: notes plus a duration / planned-date / area / project table. */
function BacklogDetail(props: {
  item: BacklogItem;
  areas: Area[];
  activityTypes: ActivityType[];
  projects: Project[];
  todayIso: string;
}) {
  const { item, areas, activityTypes, projects, todayIso } = props;
  const title = item.name || "(untitled)";
  const notes = typeof item.notes === "string" ? item.notes.trim() : "";
  const duration = backlogDurationLabel(item);
  const planned = plannedLabel(item, todayIso);
  const area = resolveArea(item, areas);
  const activity = resolveActivity(item, activityTypes);
  const project = projectLabel(item, projects);
  const priority = priorityLabel(item);

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
          {project ? <List.Item.Detail.Metadata.Label title="Project" text={project} /> : null}
          {priority ? (
            <List.Item.Detail.Metadata.Label
              title="Priority"
              text={priority}
              icon={priorityIcon(itemPriority(item) ?? 0)}
            />
          ) : null}
          {item.kind === "non_blocking" || item.kind === "reference" ? (
            <List.Item.Detail.Metadata.Label
              title="Type"
              text={item.kind === "reference" ? "Reference" : "Non-blocking"}
            />
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function accessories(item: BacklogItem, areas: Area[], projects: Project[], todayIso: string): List.Item.Accessory[] {
  const out: List.Item.Accessory[] = [];
  const priority = priorityLabel(item);
  if (priority) {
    out.push({ icon: priorityIcon(itemPriority(item) ?? 0), text: priority, tooltip: `${priority} priority` });
  }
  const project = projectLabel(item, projects);
  if (project) out.push({ tag: project, tooltip: `Project: ${project}` });
  const area = resolveArea(item, areas);
  if (area) out.push({ tag: { value: area.name, color: area.color } });
  const planned = plannedLabel(item, todayIso);
  if (planned) out.push({ icon: Icon.Calendar, tooltip: `Planned for ${planned}` });
  const duration = backlogDurationLabel(item);
  if (duration) out.push({ text: duration });
  return out;
}

/** A human duration from `durationMinutes`, or "" when it is absent or invalid. */
function backlogDurationLabel(item: BacklogItem): string {
  const minutes = item.durationMinutes;
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return "";
  return humanDuration(minutes);
}

/** A friendly planned-date label, or "" when the field is absent or not a date. */
function plannedLabel(item: BacklogItem, todayIso: string): string {
  return isIsoDate(item.plannedDate) ? relativeDayLabel(item.plannedDate, todayIso) : "";
}

function itemColor(item: BacklogItem, areas: Area[]): Color | string {
  return resolveArea(item, areas)?.color ?? Color.SecondaryText;
}

// The values of the priority filter. The server keeps the items at this priority or higher.
const MIN_PRIORITY_CHOICES = [
  { value: 0, title: "All" },
  ...[...PRIORITIES_DESC].reverse().map((value) => ({
    value,
    title: value === 4 ? PRIORITY_LABELS[value] : `${PRIORITY_LABELS[value]}+`,
  })),
];

// The Set Priority menu, highest first. 0 clears the priority.
const PRIORITY_CHOICES = [
  ...PRIORITIES_DESC.map((value) => ({ value, title: PRIORITY_LABELS[value] })),
  { value: 0, title: "No Priority" },
];

const PRIORITY_COLORS: Record<Priority, Color> = {
  1: Color.Blue,
  2: Color.Yellow,
  3: Color.Orange,
  4: Color.Red,
};

/** A flag in the priority color, or a plain flag for no priority. */
function priorityIcon(priority: number): Image.ImageLike {
  const color = PRIORITY_COLORS[priority as Priority];
  return color ? { source: Icon.Flag, tintColor: color } : Icon.Flag;
}

/** The project name of an item, with "(archived)" for an archived project. Null for none. */
function projectLabel(item: BacklogItem, projects: Project[]): string | null {
  const project = resolveProject(item, projects);
  if (!project) return null;
  return project.archived ? `${project.name} (archived)` : project.name;
}

/** The project name of an item, for the row's search keywords. */
function projectNames(item: BacklogItem, projects: Project[]): string[] {
  const project = resolveProject(item, projects);
  return project ? [project.name] : [];
}
