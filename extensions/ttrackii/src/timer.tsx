import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  entries,
  resources,
  startTimer,
  stopTimer,
  timer,
  updateTimer,
} from "./lib/api";
import {
  clock,
  compatible,
  dayLabel,
  defaultRate,
  duration,
  elapsed,
  formatRate,
  isCurrency,
  parseRate,
  rateInput,
  suggestTasks,
  timerSelection,
} from "./lib/domain";
import { launch, message, refreshMenuBar } from "./lib/actions";
import { useWorkspaces } from "./lib/hooks";
import { menuState } from "./lib/store";
import { useAuth, withAuth } from "./components/auth";
import {
  AccountSection,
  dotIcon,
  projectIcon,
  RefreshAction,
  tagColor,
  tagIcon,
} from "./components/shared";
import { StartTimerForm } from "./start-timer";
import type {
  Billing,
  Entry,
  EntriesPage,
  Resources,
  Tag,
  Timer,
} from "./lib/types";

// Autocomplete covers the latest page instantly; a server search (which costs
// API quota) runs only after a pause in typing and is cached per query.
const SEARCH_DELAY = 500;
const MIN_SERVER_QUERY = 2;
const RECENT_LIMIT = 8;
const SUGGESTION_LIMIT = 6;
const NO_PROJECT = "none";

function TimerCommand(props: { launchContext?: { edit?: boolean } }) {
  const auth = useAuth();
  const ws = useWorkspaces();
  const [current, setCurrent] = useState(() => menuState<Timer>().timer?.data);
  const [available, setAvailable] = useState<Resources>();
  const [recent, setRecent] = useState<EntriesPage>();
  const [results, setResults] = useState<Record<string, EntriesPage>>({});
  const [task, setTask] = useState("");
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [billing, setBilling] = useState<Billing>({ mode: "default" });
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now());
  const busy = useRef(false);
  const generation = useRef(0);
  const query = task.trim();

  useEffect(() => {
    if (!ws.workspaceId) return;
    const run = ++generation.current;
    setLoading(true);
    setResults({});
    void Promise.all([
      timer(),
      resources(ws.workspaceId, revision > 0),
      entries(ws.workspaceId),
    ])
      .then(([running, lookup, page]) => {
        if (generation.current !== run) return;
        setCurrent(running);
        setAvailable(lookup);
        setRecent(page);
      })
      .catch(async (error) => {
        if (generation.current !== run || auth.handle(error)) return;
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load ttrackii",
          message: message(error),
        });
      })
      .finally(() => {
        if (generation.current === run) setLoading(false);
      });
  }, [ws.workspaceId, revision]);

  useEffect(() => {
    if (!current?.running) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [current?.running]);

  useEffect(() => {
    if (!ws.workspaceId || query.length < MIN_SERVER_QUERY || results[query])
      return;
    const run = generation.current;
    const wait = setTimeout(() => {
      setSearching(true);
      void entries(ws.workspaceId, query)
        .then((page) => {
          if (generation.current === run)
            setResults((cached) => ({ ...cached, [query]: page }));
        })
        .catch((error) => {
          // Suggestions are optional; the local ones stay.
          if (generation.current === run) auth.handle(error);
        })
        .finally(() => setSearching(false));
    }, SEARCH_DELAY);
    return () => clearTimeout(wait);
  }, [query, ws.workspaceId, results]);

  const refresh = useCallback(() => {
    setRevision((v) => v + 1);
    void ws.reload();
  }, [ws.reload]);

  const workspace = ws.data?.workspaces.find((w) => w.id === ws.workspaceId);
  const team = workspace?.kind === "team";
  const project = available?.projects.find((p) => p.id === projectId);
  const tagById = (id: string) => available?.tags.find((t) => t.id === id);
  const chosenTags = tagIds.map(tagById).filter((t) => t !== undefined);
  const inferredProject =
    project ??
    available?.projects.find(
      (p) => p.id === chosenTags.find((t) => t.projectId)?.projectId,
    );
  const fallbackRate = defaultRate(inferredProject, chosenTags);
  const currencyHint =
    fallbackRate?.billingCurrency ??
    inferredProject?.billingCurrency ??
    ws.data?.defaultCurrency ??
    "USD";
  const rateLabel =
    billing.mode === "none"
      ? "Non-billable"
      : billing.mode === "custom"
        ? formatRate(billing.billingRateMinor, billing.billingCurrency)
        : fallbackRate
          ? formatRate(
              fallbackRate.billingRateMinor,
              fallbackRate.billingCurrency,
            )
          : undefined;

  const pool = [
    ...(results[query]?.entries ?? []),
    ...(recent?.entries ?? []),
  ].sort((a, b) => b.startTime - a.startTime);
  const suggestions = suggestTasks(
    pool,
    query,
    query ? SUGGESTION_LIMIT : RECENT_LIMIT,
  );

  function selectProject(id: string) {
    setProjectId(id);
    const next = available?.projects.find((p) => p.id === id);
    // Drop tags that no longer fit; a project tag would re-select its project.
    setTagIds((selected) =>
      selected.filter((tagId, index) => {
        const tag = tagById(tagId);
        const before = selected
          .slice(0, index)
          .map(tagById)
          .filter((t) => t !== undefined);
        return tag && compatible(next, tag, before) && (next || !tag.projectId);
      }),
    );
  }
  function toggleTag(tag: Tag) {
    if (tagIds.includes(tag.id)) {
      setTagIds(tagIds.filter((id) => id !== tag.id));
      return;
    }
    setTagIds([...tagIds, tag.id]);
    if (projectId === NO_PROJECT && tag.projectId) setProjectId(tag.projectId);
  }
  /** Repeat an entry's rate choice: custom stays custom, an opted-out entry stays non-billable. */
  function billingOf(entry: Entry): Billing {
    if (
      entry.billingSource === "custom" &&
      entry.billingRateMinor != null &&
      entry.billingCurrency
    )
      return {
        mode: "custom",
        billingRateMinor: entry.billingRateMinor,
        billingCurrency: entry.billingCurrency,
      };
    const tags = (entry.tagIds ?? [])
      .map(tagById)
      .filter((t) => t !== undefined);
    const wouldBill = defaultRate(
      available?.projects.find((p) => p.id === entry.projectId),
      tags,
    );
    return !entry.isBillable && wouldBill
      ? { mode: "none" }
      : { mode: "default" };
  }
  /** Autocomplete: take the entry's task, project, tags, and rate, ready to adjust. */
  function fillIn(entry: Entry) {
    setTask(entry.taskName);
    setProjectId(
      entry.projectId &&
        available?.projects.some((p) => p.id === entry.projectId)
        ? entry.projectId
        : NO_PROJECT,
    );
    setTagIds((entry.tagIds ?? []).filter((id) => tagById(id)));
    setBilling(billingOf(entry));
  }

  async function start(
    name: string,
    selection: { projectId: string; tagIds: string[] },
    rate: Billing,
  ) {
    if (busy.current || !workspace || !available) return;
    let selected;
    try {
      selected = timerSelection(
        workspace,
        available,
        selection.projectId === NO_PROJECT ? "" : selection.projectId,
        selection.tagIds,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title:
          team && !inferredProject
            ? "Pick a project first"
            : "Can't start this timer",
        message:
          team && !inferredProject
            ? "Team timers need a project. Choose one from the dropdown."
            : message(error),
      });
      return;
    }
    busy.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting timer…",
    });
    try {
      await startTimer({ ...selected, taskName: name.trim(), billing: rate });
      await refreshMenuBar();
      await showHUD(`Started “${name.trim() || "Untitled"}”`);
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      if (auth.handle(error)) return void toast.hide();
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't start timer";
      toast.message = message(error);
      refresh();
    } finally {
      busy.current = false;
    }
  }
  /** Names (or renames) the running timer without stopping it. */
  async function rename(name: string) {
    const entry = current?.running ? current.entry : null;
    if (busy.current || !entry) return;
    busy.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Renaming timer…",
    });
    try {
      await updateTimer({ entryId: entry.id, taskName: name.trim() });
      await refreshMenuBar();
      await showHUD(`Renamed to “${name.trim()}”`);
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      if (auth.handle(error)) return void toast.hide();
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't rename timer";
      toast.message = message(error);
      refresh();
    } finally {
      busy.current = false;
    }
  }
  async function stop() {
    if (busy.current) return;
    busy.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Stopping timer…",
    });
    try {
      const result = await stopTimer();
      await refreshMenuBar();
      await showHUD(
        `Stopped “${result.entry?.taskName || "Untitled"}” · ${duration(result.elapsedMs)}`,
      );
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      if (auth.handle(error)) return void toast.hide();
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't stop timer";
      toast.message = message(error);
      refresh();
    } finally {
      busy.current = false;
    }
  }

  const tagAccessories = (tags: { name: string; color?: string | null }[]) => [
    ...tags.slice(0, 2).map((tag) => ({
      tag: { value: tag.name, color: tagColor(tag.color) },
    })),
    ...(tags.length > 2
      ? [
          {
            text: `+${tags.length - 2}`,
            tooltip: tags
              .slice(2)
              .map((t) => t.name)
              .join(", "),
          },
        ]
      : []),
  ];
  const entryTags = (entry: Entry) =>
    (entry.tagIds ?? []).map((id, index) => ({
      name: tagById(id)?.name ?? entry.tagNames?.[index] ?? "Tag",
      color: tagById(id)?.color,
    }));
  const draft = {
    workspaceId: ws.workspaceId,
    taskName: task,
    projectId: projectId === NO_PROJECT ? null : projectId,
    tagIds,
    billing,
  };
  const fullFormAction = (
    <Action.Push
      title="Open Full Form"
      icon={Icon.Sidebar}
      shortcut={Keyboard.Shortcut.Common.Edit}
      target={<StartTimerForm draft={draft} />}
    />
  );
  const commonActions = (
    <>
      {(ws.data?.workspaces.length ?? 0) > 1 && (
        <ActionPanel.Submenu
          title="Change Workspace"
          icon={Icon.TwoPeople}
          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
        >
          {ws.data?.workspaces.map((w) => (
            <Action
              key={w.id}
              title={w.kind === "personal" ? "Personal" : w.name}
              icon={w.id === ws.workspaceId ? Icon.Checkmark : undefined}
              onAction={() => {
                setProjectId(NO_PROJECT);
                setTagIds([]);
                ws.select(w.id);
              }}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      <Action
        title="Recent Entries"
        icon={Icon.List}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        onAction={() => launch("recent-entries")}
      />
      <ActionPanel.Section>
        <RefreshAction onAction={refresh} />
      </ActionPanel.Section>
      <AccountSection />
    </>
  );

  const running = current?.running ? current : undefined;
  const editDraft = running?.entry
    ? {
        workspaceId: running.entry.workspaceId ?? ws.workspaceId,
        taskName: running.entry.taskName,
        projectId: running.entry.projectId ?? null,
        tagIds: running.entry.tagIds ?? [],
        billing: billingOf(running.entry),
      }
    : undefined;
  const editAction = running?.entry && (
    <Action.Push
      title="Edit Running Timer…"
      icon={Icon.Pencil}
      shortcut={Keyboard.Shortcut.Common.Edit}
      target={
        <StartTimerForm
          editing={{ entryId: running.entry.id }}
          draft={editDraft}
          onStarted={refresh}
        />
      }
    />
  );
  // Opened from the menu bar's "Edit Timer…": go straight to the form.
  if (props.launchContext?.edit && running?.entry && available)
    return (
      <StartTimerForm
        editing={{ entryId: running.entry.id }}
        draft={editDraft}
      />
    );
  const runningSection = running?.entry && (
    <List.Section title="Running">
      <List.Item
        id="running"
        title={running.entry.taskName || "Untitled"}
        subtitle={
          running.entry.taskName
            ? (running.entry.projectName ?? undefined)
            : "Type a name to give it one"
        }
        icon={{ source: Icon.Play, tintColor: Color.Green }}
        accessories={[
          ...tagAccessories(entryTags(running.entry)),
          {
            text: { value: clock(elapsed(running, now)), color: Color.Green },
          },
        ]}
        actions={
          <ActionPanel>
            <Action title="Stop Timer" icon={Icon.Stop} onAction={stop} />
            {editAction}
            {commonActions}
          </ActionPanel>
        }
      />
    </List.Section>
  );
  const startSection = (
    <List.Section title="Start">
      <List.Item
        id="start"
        title={
          query
            ? running
              ? `Stop “${running.entry?.taskName || "Untitled"}” and Start “${query}”`
              : `Start “${query}”`
            : running
              ? "Switch to a New Timer"
              : "Start Timer"
        }
        subtitle={query ? undefined : "Type a task, or start without one"}
        icon={{ source: Icon.PlusCircle, tintColor: Color.Purple }}
        accessories={[
          ...(inferredProject
            ? [
                {
                  icon: projectIcon(inferredProject.color),
                  text: inferredProject.name,
                },
              ]
            : []),
          ...tagAccessories(chosenTags),
          ...(rateLabel
            ? [
                {
                  icon: Icon.Coins,
                  text: rateLabel,
                  tooltip: "Rate (⌘B to change)",
                },
              ]
            : []),
        ]}
        actions={
          <ActionPanel>
            <Action
              title={running ? "Switch Timer" : "Start Timer"}
              icon={Icon.Play}
              onAction={() => start(task, { projectId, tagIds }, billing)}
            />
            {(available?.tags.length ?? 0) > 0 && (
              <ActionPanel.Submenu
                title="Tags"
                icon={Icon.Tag}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
              >
                {available?.tags
                  .filter(
                    (tag) =>
                      tagIds.includes(tag.id) ||
                      compatible(project, tag, chosenTags),
                  )
                  .map((tag) => (
                    <Action
                      key={tag.id}
                      title={tag.name}
                      icon={
                        tagIds.includes(tag.id)
                          ? {
                              source: Icon.CheckCircle,
                              tintColor: tagColor(tag.color),
                            }
                          : tagIcon(tag.color)
                      }
                      onAction={() => toggleTag(tag)}
                    />
                  ))}
              </ActionPanel.Submenu>
            )}
            <ActionPanel.Submenu
              title="Rate"
              icon={Icon.Coins}
              shortcut={{ modifiers: ["cmd"], key: "b" }}
            >
              <Action
                title={
                  fallbackRate
                    ? `Default · ${formatRate(fallbackRate.billingRateMinor, fallbackRate.billingCurrency)}`
                    : "Default · No Rate Set"
                }
                icon={
                  billing.mode === "default" ? Icon.CheckCircle : Icon.Circle
                }
                onAction={() => setBilling({ mode: "default" })}
              />
              <Action
                title="Non-Billable"
                icon={
                  billing.mode === "none" ? Icon.CheckCircle : Icon.MinusCircle
                }
                onAction={() => setBilling({ mode: "none" })}
              />
              <Action.Push
                title="Custom Rate…"
                icon={
                  billing.mode === "custom" ? Icon.CheckCircle : Icon.Pencil
                }
                target={
                  <CustomRateForm
                    initial={billing.mode === "custom" ? billing : undefined}
                    currency={currencyHint}
                    onSubmit={setBilling}
                  />
                }
              />
            </ActionPanel.Submenu>
            {fullFormAction}
            {commonActions}
          </ActionPanel>
        }
      />
    </List.Section>
  );
  // Typing while a timer runs names it by default; switching is the next row.
  const renameSection = running?.entry && query && (
    <List.Section title="Running">
      <List.Item
        id="rename"
        title={`Rename to “${query}”`}
        subtitle={`Keeps “${running.entry.taskName || "Untitled"}” running · ${clock(elapsed(running, now))}`}
        icon={{ source: Icon.Pencil, tintColor: Color.Green }}
        actions={
          <ActionPanel>
            <Action
              title="Rename Running Timer"
              icon={Icon.Pencil}
              onAction={() => rename(query)}
            />
            {editAction}
            <Action title="Stop Timer" icon={Icon.Stop} onAction={stop} />
            {commonActions}
          </ActionPanel>
        }
      />
    </List.Section>
  );
  const suggestionSection = suggestions.length > 0 && (
    <List.Section title={query ? "Suggestions" : "Recent"}>
      {suggestions.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.taskName}
          subtitle={entry.projectName ?? undefined}
          icon={dotIcon(
            entry.projectColor ??
              available?.projects.find((p) => p.id === entry.projectId)?.color,
          )}
          accessories={[
            ...tagAccessories(entryTags(entry)),
            {
              text: dayLabel(entry.startTime),
              tooltip: duration(entry.durationMs),
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Continue Timer"
                icon={Icon.Play}
                onAction={() =>
                  start(
                    entry.taskName,
                    {
                      projectId: entry.projectId ?? NO_PROJECT,
                      tagIds: entry.tagIds ?? [],
                    },
                    billingOf(entry),
                  )
                }
              />
              <Action
                title="Autocomplete Task"
                icon={Icon.TextCursor}
                onAction={() => fillIn(entry)}
              />
              {commonActions}
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );

  return (
    <List
      isLoading={ws.loading || loading || searching}
      filtering={false}
      searchText={task}
      onSearchTextChange={setTask}
      navigationTitle="Timer"
      searchBarPlaceholder={
        running ? "Switch to a new task…" : "What are you working on?"
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Project"
          value={projectId}
          onChange={selectProject}
        >
          <List.Dropdown.Item
            value={NO_PROJECT}
            title={team ? "Choose Project" : "No Project"}
            icon={Icon.Circle}
          />
          {available?.projects.map((p) => (
            <List.Dropdown.Item
              key={p.id}
              value={p.id}
              title={p.name}
              icon={projectIcon(p.color)}
            />
          ))}
        </List.Dropdown>
      }
    >
      {/* While typing, ↵ renames a running timer, or starts one when idle. */}
      {query ? (
        <>
          {renameSection}
          {startSection}
          {suggestionSection}
        </>
      ) : (
        <>
          {runningSection}
          {startSection}
          {suggestionSection}
        </>
      )}
    </List>
  );
}

function CustomRateForm({
  initial,
  currency,
  onSubmit,
}: {
  initial?: { billingRateMinor: number; billingCurrency: string };
  currency: string;
  onSubmit: (billing: Billing) => void;
}) {
  const { pop } = useNavigation();
  const [rate, setRate] = useState(
    initial ? rateInput(initial.billingRateMinor, initial.billingCurrency) : "",
  );
  const [code, setCode] = useState(initial?.billingCurrency ?? currency);
  const [errors, setErrors] = useState<{ rate?: string; code?: string }>({});
  return (
    <Form
      navigationTitle="Custom Rate"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Use Rate"
            icon={Icon.Checkmark}
            onSubmit={() => {
              const normalized = code.trim().toUpperCase();
              const amount = isCurrency(normalized)
                ? parseRate(rate, normalized)
                : undefined;
              if (!isCurrency(normalized) || amount === undefined) {
                setErrors({
                  code: isCurrency(normalized)
                    ? undefined
                    : "Use a 3-letter code, like EUR",
                  rate:
                    amount === undefined
                      ? "Enter an hourly amount, like 85 or 85.50"
                      : undefined,
                });
                return;
              }
              onSubmit({
                mode: "custom",
                billingRateMinor: amount,
                billingCurrency: normalized,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="rate"
        title="Hourly Rate"
        placeholder="85.00"
        value={rate}
        error={errors.rate}
        autoFocus
        onChange={(value) => {
          setRate(value);
          setErrors((current) => ({ ...current, rate: undefined }));
        }}
      />
      <Form.TextField
        id="currency"
        title="Currency"
        placeholder={currency}
        value={code}
        error={errors.code}
        onChange={(value) => {
          setCode(value.toUpperCase());
          setErrors((current) => ({ ...current, code: undefined }));
        }}
      />
    </Form>
  );
}

export default withAuth(TimerCommand, <List isLoading />);
