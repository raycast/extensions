import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  List,
  LocalStorage,
  PopToRootType,
  showHUD,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { BRAND_ACCENT } from "./lib/brand";
import type { FolnaroApi } from "./lib/folnaro";
import { elapsedSeconds, formatDuration, formatTime, isoDay } from "./lib/format";
import { t } from "./lib/text";
import { openFolnaro, showError, useFolnaro } from "./lib/raycast";
import {
  byId,
  describeEntry,
  describeTarget,
  recentTargets,
  rememberTarget,
  chosenActivity,
  startTimerFor,
  targetKey,
  workableProjects,
  type TimerTarget,
} from "./lib/timer";
import type { Customer, Project, TimeEntry } from "./lib/types";

const RECENTS_KEY = "timer.recents";

interface LaunchContext {
  projectId?: string;
}

interface TimerData {
  canStart: boolean;
  running: TimeEntry | null;
  projects: Project[];
  customers: Customer[];
  recents: TimerTarget[];
}

async function readStoredRecents(): Promise<TimerTarget[]> {
  try {
    const raw = await LocalStorage.getItem<string>(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as TimerTarget[]) : [];
  } catch {
    return [];
  }
}

async function load(api: FolnaroApi): Promise<TimerData> {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const [allowed, running, projects, customers, entries, stored] = await Promise.all([
    api.allowedTools(),
    api.runningTimer(),
    api.projects(),
    api.customers({ limit: 500 }),
    api.timeEntries({ from: isoDay(from), limit: 60 }),
    readStoredRecents(),
  ]);
  const workable = workableProjects(projects);
  const known = { projects: byId(workable), customers: byId(customers) };
  return {
    canStart: allowed.has("time_start_timer"),
    running,
    projects: workable,
    customers,
    recents: recentTargets(stored, entries, known),
  };
}

/** Starts the timer and puts its target first in the recent list kept on this Mac. */
async function start(
  api: FolnaroApi,
  target: TimerTarget,
  note: string | undefined,
  stopFirst: boolean,
): Promise<TimeEntry> {
  const entry = await startTimerFor(api, target, note, stopFirst);
  const stored = await readStoredRecents();
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(rememberTarget(stored, target)));
  return entry;
}

export default function StartTimer(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const api = useFolnaro();
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, revalidate } = usePromise(() => load(api), [], {
    onError: (error) => void showError(error),
  });
  const launchedFor = props.launchContext?.projectId;
  const startedFromContext = useRef(false);

  const known = { projects: byId(data?.projects ?? []), customers: byId(data?.customers ?? []) };

  const run = async (target: TimerTarget, note?: string) => {
    try {
      await start(api, target, note, Boolean(data?.running));
      const { title } = describeTarget(target, known);
      await showHUD(title ? t("timer.started", { target: title }) : t("timer.startedPlain"), {
        popToRootType: PopToRootType.Immediate,
      });
    } catch (error) {
      await showError(error);
      revalidate();
    }
  };

  // "Start Timer for Project" in Search Folnaro launches this command with the project.
  useEffect(() => {
    if (!launchedFor || !data || startedFromContext.current) return;
    startedFromContext.current = true;
    if (data.canStart && known.projects.has(launchedFor)) void run({ projectId: launchedFor });
  }, [launchedFor, data]);

  if (data && !data.canStart) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title={t("timer.locked.title")}
          description={t("timer.locked.description")}
          actions={
            <ActionPanel>
              <Action title={t("action.openFolnaro")} icon={Icon.AppWindow} onAction={() => openFolnaro()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const note = searchText.trim();
  const projectsWithoutRecents = (data?.projects ?? []).filter(
    (project) => !data?.recents.some((recent) => recent.projectId === project.id && !recent.activity),
  );
  const customersWithoutProjects = (data?.customers ?? []).filter((customer) => !customer.is_archived);
  const anyMatch =
    (data?.recents ?? []).some((target) => matches(target, known, note)) ||
    projectsWithoutRecents.some((project) => matches({ projectId: project.id }, known, note)) ||
    customersWithoutProjects.some((customer) => matches({ customerId: customer.id }, known, note));
  // When nothing matches, the text is a note: every row stays so it can be started with it.
  const shown = (target: TimerTarget) => !anyMatch || matches(target, known, note);
  const timerNote = anyMatch ? "" : note;

  const targetActions = (target: TimerTarget, activities: string[] = []) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={
            timerNote
              ? t("timer.startWithNote", { note: timerNote })
              : data?.running
                ? t("timer.stopAndStart")
                : t("timer.start")
          }
          icon={Icon.Play}
          onAction={() => run(target, timerNote)}
        />
        <Action.Push
          title={t("timer.startWithDetails")}
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          target={<StartTimerForm target={target} activities={activities} initialNote={timerNote} onStart={run} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={t("action.refresh")}
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t("timer.placeholder")}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {data && !data.projects.length && !customersWithoutProjects.length ? (
        <List.EmptyView
          icon={Icon.Stopwatch}
          title={t("timer.empty.title")}
          description={t("timer.empty.description")}
        />
      ) : null}
      {data?.running ? (
        <List.Section title={t("timer.section.running")}>
          <RunningItem entry={data.running} name={describeEntry(data.running, known)} api={api} onChange={revalidate} />
        </List.Section>
      ) : null}
      <List.Section title={t("timer.section.recent")}>
        {(data?.recents ?? []).filter(shown).map((target) => {
          const { title, subtitle } = describeTarget(target, known);
          const project = target.projectId ? known.projects.get(target.projectId) : undefined;
          return (
            <List.Item
              key={`recent-${targetKey(target)}`}
              icon={{ source: Icon.Clock, tintColor: BRAND_ACCENT }}
              title={title}
              subtitle={subtitle}
              actions={targetActions(target, project?.activities)}
            />
          );
        })}
      </List.Section>
      <List.Section title={t("timer.section.projects")}>
        {projectsWithoutRecents
          .filter((project) => shown({ projectId: project.id }))
          .map((project) => {
            const customer = project.customer_id ? known.customers.get(project.customer_id) : undefined;
            return (
              <List.Item
                key={`project-${project.id}`}
                icon={{ source: Icon.Folder, tintColor: BRAND_ACCENT }}
                title={project.name}
                subtitle={customer?.display_name}
                accessories={project.number ? [{ text: project.number }] : []}
                actions={targetActions({ projectId: project.id }, project.activities)}
              />
            );
          })}
      </List.Section>
      <List.Section title={t("timer.section.customers")}>
        {customersWithoutProjects
          .filter((customer) => shown({ customerId: customer.id }))
          .map((customer) => (
            <List.Item
              key={`customer-${customer.id}`}
              icon={{ source: Icon.Person, tintColor: BRAND_ACCENT }}
              title={customer.display_name}
              subtitle={t("timer.withoutProject")}
              actions={targetActions({ customerId: customer.id })}
            />
          ))}
      </List.Section>
    </List>
  );
}

/** The search text filters by project, customer and activity; every word counts. */
function matches(target: TimerTarget, known: Parameters<typeof describeTarget>[1], text: string): boolean {
  if (!text) return true;
  const { title, subtitle } = describeTarget(target, known);
  const haystack = `${title} ${subtitle ?? ""}`.toLowerCase();
  return text
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

function RunningItem(props: { entry: TimeEntry; name?: string; api: FolnaroApi; onChange: () => void }) {
  const { entry } = props;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = elapsedSeconds(entry, now);
  return (
    <List.Item
      icon={{ source: Icon.Stopwatch, tintColor: BRAND_ACCENT }}
      title={props.name ?? t("timer.withoutProject")}
      subtitle={entry.note || entry.activity || undefined}
      accessories={[
        ...(entry.started_at ? [{ text: t("timer.runningSince", { time: formatTime(entry.started_at) }) }] : []),
        { text: formatDuration(elapsed) },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={t("timer.stop")}
            icon={Icon.Stop}
            onAction={async () => {
              try {
                const stopped = await props.api.stopTimer();
                await showHUD(t("timer.stopped", { duration: formatDuration(stopped.duration_seconds) }), {
                  popToRootType: PopToRootType.Immediate,
                });
              } catch (error) {
                await showError(error);
                props.onChange();
              }
            }}
          />
          <Action
            title={t("menu.openTime")}
            icon={Icon.AppWindow}
            onAction={() => openFolnaro(`folnaro://time/${encodeURIComponent(entry.id)}`)}
          />
        </ActionPanel>
      }
    />
  );
}

function StartTimerForm(props: {
  target: TimerTarget;
  activities: string[];
  initialNote: string;
  onStart: (target: TimerTarget, note?: string) => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("timer.start")}
            icon={Icon.Play}
            onSubmit={async (values: { note: string; activity?: string }) => {
              await props.onStart(
                { ...props.target, activity: chosenActivity(values.activity, props.target.activity) },
                values.note,
              );
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="note"
        title={t("timer.form.note")}
        placeholder={t("timer.form.notePlaceholder")}
        defaultValue={props.initialNote}
      />
      {props.activities.length ? (
        <Form.Dropdown id="activity" title={t("timer.form.activity")} defaultValue={props.target.activity ?? ""}>
          <Form.Dropdown.Item value="" title={t("timer.form.noActivity")} />
          {props.activities.map((activity) => (
            <Form.Dropdown.Item key={activity} value={activity} title={activity} />
          ))}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}
