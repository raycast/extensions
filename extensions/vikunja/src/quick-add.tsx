import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchProps,
  List,
  Toast,
  getPreferenceValues,
  open,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { Label, Project, getLabels, getProjects } from "./api";
import QuickAddForm from "./components/quick-add-form";
import { resolveAssignees } from "./helpers/assignees";
import {
  addToHistory,
  clearHistory,
  loadHistory,
  removeFromHistory,
} from "./helpers/history";
import {
  buildMagicPreview,
  getPrefixMode,
  submitQuickAdd,
} from "./helpers/magic";
import { PRIORITY_COLORS } from "./helpers/priorities";
import { PrefixMode } from "./quickAddMagic";

/** Placeholder and empty-state copy that match the configured prefix syntax. */
function syntaxHints(mode: PrefixMode): {
  placeholder: string;
  description: string;
} {
  switch (mode) {
    case PrefixMode.Todoist:
      return {
        placeholder: "Buy milk tomorrow @shopping #Inbox !3 monthly",
        description:
          "Todoist syntax: @label, #project, !priority,\nnatural dates and repeats like 'every week'.",
      };
    case PrefixMode.Disabled:
      return {
        placeholder: "Buy milk",
        description:
          "Quick Add Magic is disabled, so the whole line becomes the title.\nEnable it in this extension's preferences.",
      };
    default:
      return {
        placeholder: "Buy milk tomorrow *shopping +Inbox !3 monthly",
        description:
          "Use *label, +project, !priority,\nnatural dates and repeats like 'every week'.",
      };
  }
}

function formatDate(date: Date): string {
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export default function QuickAdd(
  props: LaunchProps<{ arguments: Arguments.QuickAdd }>,
) {
  const { push } = useNavigation();
  const [text, setText] = useState(props.arguments.text?.trim() ?? "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, l] = await Promise.all([getProjects(), getLabels()]);
        setProjects(p);
        setLabels(l);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load projects and labels",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    })();

    loadHistory().then(setHistory);
  }, []);

  const preview = useMemo(
    () => (text.trim() ? buildMagicPreview(text, projects, labels) : null),
    [text, projects, labels],
  );

  const defaultProjectId = useMemo(() => {
    const { defaultProject } = getPreferenceValues<Preferences>();
    if (!defaultProject || defaultProject === "all") return undefined;
    const id = parseInt(defaultProject);
    return isNaN(id) ? undefined : id;
  }, []);

  const targetProject =
    preview?.project ??
    projects.find((p) => p.id === defaultProjectId) ??
    projects[0];

  async function createDirectly() {
    if (!preview || preview.isEmpty || !targetProject) return;
    try {
      showToast({ style: Toast.Style.Animated, title: "Creating task…" });

      // Resolved here too so that Create Now behaves the same as the review
      // step; skipping it would silently drop assignees.
      const assignees = await resolveAssignees(
        preview.assigneeNames,
        targetProject.id,
      );

      const task = await submitQuickAdd(
        preview,
        targetProject.id,
        preview.labelValues,
        { assignees: assignees.matched },
      );
      await addToHistory(preview.input);

      if (assignees.unmatchedNames.length > 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Task created",
          message: `Not a member of ${targetProject.title}: ${assignees.unmatchedNames.join(", ")}`,
        });
        popToRoot();
        return;
      }

      showToast({
        style: Toast.Style.Success,
        title: "Task created",
        message: task.title,
        primaryAction: {
          title: "Open in Vikunja",
          onAction: () => {
            const { apiUrl } = getPreferenceValues<Preferences>();
            open(`${apiUrl.replace(/\/+$/, "")}/projects/${targetProject.id}`);
          },
        },
      });
      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create task",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const canSubmit = Boolean(preview && !preview.isEmpty && targetProject);
  const hints = syntaxHints(getPrefixMode());

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={hints.placeholder}
      searchText={text}
      onSearchTextChange={setText}
      isShowingDetail={Boolean(preview)}
      actions={
        canSubmit ? undefined : (
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Vikunja"
              url={getPreferenceValues<Preferences>().apiUrl}
            />
          </ActionPanel>
        )
      }
    >
      {!text.trim() ? (
        history.length > 0 ? (
          <List.Section title="Recent">
            {history.map((entry) => (
              <List.Item
                key={entry}
                icon={Icon.Clock}
                title={entry}
                actions={
                  <ActionPanel>
                    <Action
                      title="Use This Input"
                      icon={Icon.ArrowRight}
                      onAction={() => setText(entry)}
                    />
                    <ActionPanel.Section>
                      <Action
                        title="Remove from History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={async () =>
                          setHistory(await removeFromHistory(entry))
                        }
                      />
                      <Action
                        title="Clear History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                        onAction={async () => {
                          await clearHistory();
                          setHistory([]);
                        }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={Icon.Stars}
            title="Quick Add Magic"
            description={hints.description}
          />
        )
      ) : preview?.isEmpty ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Nothing left for the title"
          description="Everything you typed was consumed by magic tokens. Add some text for the task title."
        />
      ) : preview && targetProject ? (
        <List.Item
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          title={preview.title}
          subtitle={`in ${targetProject.title}`}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Title"
                    text={preview.title}
                  />

                  <List.Item.Detail.Metadata.Label
                    title="Due Date"
                    text={
                      preview.parsed.date
                        ? formatDate(preview.parsed.date)
                        : "—"
                    }
                    icon={preview.parsed.date ? Icon.Calendar : undefined}
                  />

                  {preview.unmatchedProject ? (
                    <List.Item.Detail.Metadata.Label
                      title="Project"
                      text={`"${preview.unmatchedProject}" not found — using ${targetProject.title}`}
                      icon={{
                        source: Icon.Warning,
                        tintColor: Color.Orange,
                      }}
                    />
                  ) : (
                    <List.Item.Detail.Metadata.Label
                      title="Project"
                      text={targetProject.title}
                      icon={preview.project ? Icon.Folder : Icon.CircleDisabled}
                    />
                  )}

                  {preview.parsed.labels.length > 0 ? (
                    <List.Item.Detail.Metadata.TagList title="Labels">
                      {preview.parsed.labels.map((title) => {
                        const isNew =
                          preview.missingLabelTitles.includes(title);
                        return (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={title}
                            text={isNew ? `${title} (new)` : title}
                            color={isNew ? Color.Orange : Color.Blue}
                          />
                        );
                      })}
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Labels" text="—" />
                  )}

                  <List.Item.Detail.Metadata.Label
                    title="Priority"
                    text={preview.priorityLabel ?? "—"}
                    icon={
                      preview.parsed.priority
                        ? {
                            source: Icon.Exclamationmark,
                            tintColor: PRIORITY_COLORS[preview.parsed.priority],
                          }
                        : undefined
                    }
                  />

                  <List.Item.Detail.Metadata.Label
                    title="Repeats"
                    text={preview.repeatText ?? "—"}
                    icon={preview.repeatText ? Icon.Repeat : undefined}
                  />

                  {preview.reminderNeedsDueDate ? (
                    <List.Item.Detail.Metadata.Label
                      title="Reminder"
                      text={`${preview.reminderLabel} — needs a due date`}
                      icon={{ source: Icon.Bell, tintColor: Color.Orange }}
                    />
                  ) : (
                    <List.Item.Detail.Metadata.Label
                      title="Reminder"
                      text={preview.reminderLabel ?? "—"}
                      icon={preview.reminderLabel ? Icon.Bell : undefined}
                    />
                  )}

                  {preview.assigneeNames.length > 0 && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Assignees"
                        text={`${preview.assigneeNames.join(", ")} — matched against project members on submit`}
                        icon={Icon.Person}
                      />
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Review and Create…"
                icon={Icon.Sidebar}
                onAction={() =>
                  push(
                    <QuickAddForm
                      preview={preview}
                      projects={projects}
                      labels={labels}
                      defaultProjectId={targetProject.id}
                    />,
                  )
                }
              />
              <Action
                title="Create Now"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                onAction={createDirectly}
              />
              <ActionPanel.Section>
                <Action.OpenInBrowser
                  title="Open Vikunja"
                  url={getPreferenceValues<Preferences>().apiUrl}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No project available"
          description="Create a project in Vikunja first."
        />
      )}
    </List>
  );
}
