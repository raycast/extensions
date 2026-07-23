import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  Color,
  confirmAlert,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { dirname } from "node:path";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPrompt,
  deletePrompt,
  duplicatePrompt,
  ensurePromptSearchIndex,
  listPrompts,
  listPromptVersions,
  resolvePromptDirectory,
  restorePromptVersion,
  updatePrompt,
  type InvalidPrompt,
  type PromptRecord,
  type PromptUpdate,
} from "./core/prompt-store";
import { getFeatureStatus, loadFeatureStatuses } from "./core/features";
import { currentProjectCommit } from "./core/project-context";
import { ensureQmd, fusePromptSearch, searchQmd } from "./core/qmd-search";
import {
  defaultSearchIndexPath,
  loadPromptUsage,
  recordPromptUse,
  searchPrompts,
  type SearchFilters,
  type SearchResult,
} from "./core/search-index";
import { extractPlaceholders, fillPlaceholders } from "./core/placeholders";
import {
  commaSeparated,
  PromptForm,
  type PromptFormValues,
} from "./prompt-form";
import { createPromptUseFeedback } from "./core/feedback-store";
import { FeedbackForm, feedbackDraftFromForm } from "./feedback-form";
import FeatureStatus from "./feature-status";
import PromptFeedback from "./prompt-feedback";

interface Preferences {
  libraryDirectory?: string;
  qmdExecutable?: string;
  projectRoots?: string;
  sshProjectRoot?: string;
}

type LibraryFilter =
  | "current"
  | "all"
  | "favorites"
  | `target:${PromptRecord["target"]}`
  | `project:${string}`
  | `tag:${string}`;

export default function BrowsePrompts() {
  const preferences = getPreferenceValues<Preferences>();
  const directory = useMemo(() => {
    try {
      return resolvePromptDirectory(preferences.libraryDirectory);
    } catch {
      return undefined;
    }
  }, [preferences.libraryDirectory]);
  const [records, setRecords] = useState<PromptRecord[]>([]);
  const [invalid, setInvalid] = useState<InvalidPrompt[]>([]);
  const [filter, setFilter] = useState<LibraryFilter>("current");
  const [searchText, setSearchText] = useState("");
  const [sqliteActive, setSqliteActive] = useState(false);
  const [qmdActive, setQmdActive] = useState(false);
  const [feedbackEnabled, setFeedbackEnabled] = useState(false);
  const [semanticSearching, setSemanticSearching] = useState(false);
  const [indexedResults, setIndexedResults] = useState<SearchResult[]>();
  const [projectCommits, setProjectCommits] = useState<
    Map<string, string | undefined>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const resolvedDirectory =
        directory ?? resolvePromptDirectory(preferences.libraryDirectory);
      const statuses = await loadFeatureStatuses();
      const indexIsActive =
        getFeatureStatus(statuses, "sqlite-search").effectiveState === "active";
      if (indexIsActive) await ensurePromptSearchIndex(resolvedDirectory);
      const library = await listPrompts(resolvedDirectory);
      const projectContextEnabled =
        getFeatureStatus(statuses, "project-context").effectiveState !==
        "disabled";
      const qmdIsEnabled =
        getFeatureStatus(statuses, "qmd-discovery").effectiveState !==
        "disabled";
      setFeedbackEnabled(
        getFeatureStatus(statuses, "feedback").effectiveState !== "disabled",
      );
      let qmdIsReady = false;
      if (qmdIsEnabled) {
        try {
          qmdIsReady =
            (
              await ensureQmd(
                resolvedDirectory,
                library.records,
                preferences.qmdExecutable,
              )
            ).state === "healthy";
        } catch (qmdError) {
          await showToast(
            Toast.Style.Failure,
            "Meaning Search Unavailable",
            `SQLite exact search remains active. ${qmdError instanceof Error ? qmdError.message : String(qmdError)}`,
          );
        }
      }
      setRecords(library.records);
      setInvalid(library.invalid);
      setSqliteActive(indexIsActive);
      setQmdActive(qmdIsReady);
      if (projectContextEnabled) {
        const paths = [
          ...new Set(
            library.records.flatMap((record) =>
              record.project ? [record.project.path] : [],
            ),
          ),
        ];
        setProjectCommits(
          new Map(
            await Promise.all(
              paths.map(
                async (path) =>
                  [
                    path,
                    await currentProjectCommit(
                      path,
                      preferences.projectRoots,
                      preferences.sshProjectRoot,
                    ),
                  ] as const,
              ),
            ),
          ),
        );
      } else {
        setProjectCommits(new Map());
      }
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : String(loadError);
      setError(message);
      await showToast(Toast.Style.Failure, "Could Not Load Prompts", message);
    } finally {
      setLoading(false);
    }
  }, [
    directory,
    preferences.libraryDirectory,
    preferences.projectRoots,
    preferences.qmdExecutable,
    preferences.sshProjectRoot,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!sqliteActive) {
      setIndexedResults(undefined);
      return;
    }
    let cancelled = false;
    try {
      const exact = searchPrompts(
        searchText,
        searchFilters(filter),
        defaultSearchIndexPath(),
      );
      setIndexedResults(exact);
      if (!qmdActive || searchText.trim().length < 2) {
        setSemanticSearching(false);
        return;
      }
      setSemanticSearching(true);
      void searchQmd(searchText, preferences.qmdExecutable)
        .then((semantic) => {
          if (cancelled) return;
          const recordsById = new Map(
            records.map((record) => [record.id, record]),
          );
          const filteredSemantic = semantic.filter((result) => {
            const record = recordsById.get(result.id);
            return record ? recordMatchesFilter(record, filter) : false;
          });
          setIndexedResults(fusePromptSearch(exact, filteredSemantic));
        })
        .catch((qmdError: unknown) => {
          if (cancelled) return;
          setQmdActive(false);
          void showToast(
            Toast.Style.Failure,
            "Meaning Search Unavailable",
            `Using SQLite exact search. ${qmdError instanceof Error ? qmdError.message : String(qmdError)}`,
          );
        })
        .finally(() => {
          if (!cancelled) setSemanticSearching(false);
        });
    } catch (searchError) {
      setSqliteActive(false);
      setIndexedResults(undefined);
      void showToast(
        Toast.Style.Failure,
        "SQLite Search Unavailable",
        `Using built-in exact search instead. ${searchError instanceof Error ? searchError.message : String(searchError)}`,
      );
    }
    return () => {
      cancelled = true;
    };
  }, [
    filter,
    preferences.qmdExecutable,
    qmdActive,
    records,
    searchText,
    sqliteActive,
  ]);

  const visible = useMemo(() => {
    if (sqliteActive && indexedResults) {
      const byId = new Map(records.map((record) => [record.id, record]));
      return indexedResults.flatMap((result) => {
        const record = byId.get(result.id);
        return record ? [record] : [];
      });
    }
    return records.filter((record) => recordMatchesFilter(record, filter));
  }, [filter, indexedResults, records, sqliteActive]);
  const matchesById = useMemo(
    () =>
      new Map(
        (indexedResults ?? []).map((result) => [
          result.id,
          result.matchedBy.join(", "),
        ]),
      ),
    [indexedResults],
  );
  const projects = useMemo(
    () =>
      [
        ...new Map(
          records
            .filter((record) => record.project)
            .map((record) => [record.project!.path, record.project!]),
        ).values(),
      ].sort((left, right) => left.name.localeCompare(right.name)),
    [records],
  );
  const taskTypes = useMemo(
    () => [...new Set(records.flatMap((record) => record.tags))].sort(),
    [records],
  );

  return (
    <List
      isLoading={loading || semanticSearching}
      isShowingDetail={visible.length + invalid.length > 0}
      filtering={!sqliteActive}
      onSearchTextChange={setSearchText}
      throttle
      searchBarPlaceholder="Search prompts… · ⌘N saves without AI"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Prompts"
          value={filter}
          onChange={(value) => setFilter(value as LibraryFilter)}
        >
          <List.Dropdown.Item title="Current Prompts" value="current" />
          <List.Dropdown.Item title="Favorites" value="favorites" />
          <List.Dropdown.Item title="All Prompts" value="all" />
          <List.Dropdown.Section title="Target">
            <List.Dropdown.Item title="Generic" value="target:generic" />
            <List.Dropdown.Item title="Codex" value="target:codex" />
            <List.Dropdown.Item
              title="Claude Code"
              value="target:claude-code"
            />
          </List.Dropdown.Section>
          {projects.length > 0 ? (
            <List.Dropdown.Section title="Project">
              {projects.map((project) => (
                <List.Dropdown.Item
                  key={project.path}
                  title={project.name}
                  value={`project:${project.path}`}
                />
              ))}
            </List.Dropdown.Section>
          ) : null}
          {taskTypes.length > 0 ? (
            <List.Dropdown.Section title="Task Type or Tag">
              {taskTypes.map((tag) => (
                <List.Dropdown.Item
                  key={tag}
                  title={tag}
                  value={`tag:${tag}`}
                />
              ))}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
    >
      {!loading && visible.length === 0 ? (
        <List.EmptyView
          icon={Icon.TextDocument}
          title={error ? "Prompt Library Unavailable" : "No Prompts Found"}
          description={
            error ??
            "Save your first prompt, then find and reuse it here in plain language."
          }
          actions={
            <ActionPanel>
              {error ? (
                <Action
                  title="Reload Prompt Library"
                  icon={Icon.ArrowClockwise}
                  onAction={load}
                />
              ) : (
                <Action.Push
                  title={
                    directory
                      ? "Save Existing Prompt"
                      : "Review Prompt Directory"
                  }
                  icon={directory ? Icon.Plus : Icon.ExclamationMark}
                  target={
                    directory ? (
                      <CreateFromLibrary
                        directory={directory}
                        onCreate={load}
                      />
                    ) : (
                      <Detail
                        navigationTitle="Prompt Directory"
                        markdown="# Prompt Directory Is Invalid\n\nUse an absolute path or a path beginning with ~/ in Prompt Studio preferences."
                      />
                    )
                  }
                />
              )}
              <Action.Push
                title="Prompt Studio Status"
                icon={Icon.Gauge}
                target={<FeatureStatus />}
              />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section title="Prompts" subtitle={`${visible.length}`}>
        {visible.map((record) => (
          <PromptItem
            key={record.id}
            record={record}
            matchReason={
              searchText.trim() ? matchesById.get(record.id) : undefined
            }
            trackUsage={sqliteActive}
            feedbackEnabled={feedbackEnabled}
            currentProjectCommit={
              record.project
                ? projectCommits.get(record.project.path)
                : undefined
            }
            onReload={load}
          />
        ))}
      </List.Section>
      {invalid.length > 0 ? (
        <List.Section title="Needs Repair" subtitle={`${invalid.length}`}>
          {invalid.map((item) => (
            <List.Item
              key={item.filePath}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              title={item.filePath.split("/").at(-1) ?? item.filePath}
              subtitle={item.error}
              detail={
                <List.Item.Detail
                  markdown={`# Invalid Prompt File\n\n${item.error}\n\n\`${item.filePath}\``}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function CreateFromLibrary({
  directory,
  onCreate,
}: {
  directory: string;
  onCreate: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <PromptForm
      navigationTitle="Save Existing Prompt"
      submitTitle="Save Unchanged"
      onSubmit={async (values) => {
        await createPrompt(directory, {
          title: values.title,
          summary: values.summary,
          body: values.body,
          target: values.target,
          tags: commaSeparated(values.tags),
          aliases: commaSeparated(values.aliases),
          searchTerms: commaSeparated(values.searchTerms),
        });
        await onCreate();
        await showToast(Toast.Style.Success, "Prompt Saved Unchanged");
        pop();
      }}
    />
  );
}

function PromptItem({
  record,
  matchReason,
  trackUsage,
  feedbackEnabled,
  currentProjectCommit,
  onReload,
}: {
  record: PromptRecord;
  matchReason: string | undefined;
  trackUsage: boolean;
  feedbackEnabled: boolean;
  currentProjectCommit: string | undefined;
  onReload: () => Promise<void>;
}) {
  const directory = dirname(record.filePath);
  const keywords = [
    record.summary,
    record.body,
    record.target,
    ...record.tags,
    ...record.aliases,
    ...record.searchTerms,
    ...(record.project ? [record.project.name, record.project.path] : []),
  ];
  async function updateFlags(
    flags: Pick<PromptUpdate, "favorite" | "archived">,
  ) {
    await updatePrompt(directory, record.id, promptUpdate(record, flags));
    await onReload();
  }

  async function duplicate() {
    await duplicatePrompt(directory, record.id);
    await showToast(Toast.Style.Success, "Prompt Duplicated");
    await onReload();
  }

  async function remove() {
    const confirmed = await confirmAlert({
      title: `Delete “${record.title}”?`,
      message: "This permanently removes the prompt and its saved versions.",
      primaryAction: {
        title: "Delete Prompt",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await deletePrompt(directory, record.id);
    await showToast(Toast.Style.Success, "Prompt Deleted");
    await onReload();
  }

  const placeholders = extractPlaceholders(record.body);

  async function usePrompt(body: string, mode: "paste" | "copy") {
    let useCount: number | undefined;
    if (trackUsage) {
      try {
        recordPromptUse(record.id);
        useCount = loadPromptUsage().get(record.id)?.useCount;
      } catch {
        // ponytail: a missing index only loses ranking, never the paste.
      }
    }
    const nudge =
      feedbackEnabled && useCount !== undefined && useCount % 5 === 0
        ? ` · Used ${useCount} times — consider recording feedback`
        : "";
    if (mode === "paste") {
      await closeMainWindow();
      await Clipboard.paste(body);
      await showHUD(`Prompt Pasted${nudge}`);
    } else {
      await Clipboard.copy(body);
      await showToast(Toast.Style.Success, "Prompt Copied", nudge || undefined);
    }
  }

  return (
    <List.Item
      icon={{
        source: record.favorite ? Icon.Star : Icon.TextDocument,
        tintColor: record.favorite ? Color.Yellow : Color.Purple,
      }}
      title={record.title}
      keywords={keywords}
      accessories={record.archivedAt ? [{ tag: "Archived" }] : []}
      detail={
        <PromptDetail
          record={record}
          currentProjectCommit={currentProjectCommit}
          matchReason={matchReason}
        />
      }
      actions={
        <ActionPanel>
          {placeholders.length > 0 ? (
            <Action.Push
              title="Fill Placeholders and Use"
              icon={Icon.TextInput}
              target={
                <PlaceholderForm
                  record={record}
                  placeholders={placeholders}
                  onUse={usePrompt}
                />
              }
            />
          ) : (
            <>
              <Action
                title="Paste Prompt"
                icon={Icon.ArrowRightCircle}
                onAction={() => usePrompt(record.body, "paste")}
              />
              <Action
                title="Copy Prompt"
                icon={Icon.Clipboard}
                onAction={() => usePrompt(record.body, "copy")}
              />
            </>
          )}
          <Action.Push
            title="Edit Prompt"
            icon={Icon.Pencil}
            target={<EditPrompt record={record} onReload={onReload} />}
          />
          <Action.Push
            title="Save Existing Prompt"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={
              <CreateFromLibrary directory={directory} onCreate={onReload} />
            }
          />
          {feedbackEnabled ? (
            <>
              <Action.Push
                title="Record Prompt Feedback"
                icon={Icon.Gauge}
                target={
                  <CreateFeedback
                    directory={directory}
                    record={record}
                    currentProjectCommit={currentProjectCommit}
                  />
                }
              />
              <Action.Push
                title="Review Prompt Feedback"
                icon={Icon.Eye}
                target={<PromptFeedback />}
              />
            </>
          ) : null}
          <ActionPanel.Section>
            <Action
              title={
                record.favorite ? "Remove from Favorites" : "Add to Favorites"
              }
              icon={Icon.Star}
              onAction={() => updateFlags({ favorite: !record.favorite })}
            />
            <Action
              title={record.archivedAt ? "Unarchive Prompt" : "Archive Prompt"}
              icon={Icon.Tray}
              onAction={() => updateFlags({ archived: !record.archivedAt })}
            />
            <Action
              title="Duplicate Prompt"
              icon={Icon.Duplicate}
              onAction={duplicate}
            />
            <Action.Push
              title="View Version History"
              icon={Icon.Clock}
              target={
                <VersionHistory
                  directory={directory}
                  record={record}
                  onRestore={onReload}
                />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Prompt Studio Status"
              icon={Icon.Gauge}
              target={<FeatureStatus />}
            />
            <Action.ShowInFinder path={record.filePath} />
            <Action
              title="Reload Prompt Library"
              icon={Icon.ArrowClockwise}
              onAction={onReload}
            />
            <Action
              title="Delete Prompt"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={remove}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function CreateFeedback({
  directory,
  record,
  currentProjectCommit,
}: {
  directory: string;
  record: PromptRecord;
  currentProjectCommit: string | undefined;
}) {
  const { pop } = useNavigation();
  return (
    <FeedbackForm
      prompt={record}
      {...(currentProjectCommit ? { currentProjectCommit } : {})}
      submitTitle="Save Prompt Feedback"
      onSubmit={async (values) => {
        await createPromptUseFeedback(
          directory,
          feedbackDraftFromForm(record, values),
        );
        await showToast(Toast.Style.Success, "Feedback Saved");
        pop();
      }}
    />
  );
}

function searchFilters(filter: LibraryFilter): SearchFilters {
  if (filter === "all") return { includeArchived: true, limit: 500 };
  if (filter === "favorites") return { favorite: true, limit: 500 };
  if (filter.startsWith("target:")) {
    return {
      target: filter.slice("target:".length) as PromptRecord["target"],
      limit: 500,
    };
  }
  if (filter.startsWith("project:")) {
    return {
      projectPath: filter.slice("project:".length),
      limit: 500,
    };
  }
  if (filter.startsWith("tag:")) {
    return { tag: filter.slice("tag:".length), limit: 500 };
  }
  return { limit: 500 };
}

function recordMatchesFilter(
  record: PromptRecord,
  filter: LibraryFilter,
): boolean {
  if (filter === "all") return true;
  if (record.archivedAt) return false;
  if (filter === "current") return true;
  if (filter === "favorites") return record.favorite;
  if (filter.startsWith("target:")) {
    return record.target === filter.slice("target:".length);
  }
  if (filter.startsWith("project:")) {
    return record.project?.path === filter.slice("project:".length);
  }
  return record.tags.includes(filter.slice("tag:".length));
}

function PromptDetail({
  record,
  currentProjectCommit,
  matchReason,
}: {
  record: PromptRecord;
  currentProjectCommit?: string | undefined;
  matchReason?: string | undefined;
}) {
  const stale =
    Boolean(record.project?.commit) &&
    Boolean(currentProjectCommit) &&
    record.project?.commit !== currentProjectCommit;
  return (
    <List.Item.Detail
      markdown={promptMarkdown(
        record,
        stale,
        currentProjectCommit,
        matchReason,
      )}
    />
  );
}

function PlaceholderForm({
  record,
  placeholders,
  onUse,
}: {
  record: PromptRecord;
  placeholders: string[];
  onUse: (body: string, mode: "paste" | "copy") => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function submit(
    values: Record<string, string>,
    mode: "paste" | "copy",
  ) {
    pop();
    await onUse(fillPlaceholders(record.body, values), mode);
  }

  return (
    <Form
      navigationTitle={`Fill ${record.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Paste Prompt"
            icon={Icon.ArrowRightCircle}
            onSubmit={(values) =>
              submit(values as Record<string, string>, "paste")
            }
          />
          <Action.SubmitForm
            title="Copy Prompt"
            icon={Icon.Clipboard}
            onSubmit={(values) =>
              submit(values as Record<string, string>, "copy")
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Blank values keep their {{placeholder}} visible so nothing is silently lost." />
      {placeholders.map((name) => (
        <Form.TextField key={name} id={name} title={name} />
      ))}
    </Form>
  );
}

function EditPrompt({
  record,
  onReload,
}: {
  record: PromptRecord;
  onReload: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <PromptForm
      navigationTitle={`Edit ${record.title}`}
      submitTitle="Save Changes"
      initial={formValues(record)}
      onSubmit={async (values) => {
        await updatePrompt(dirname(record.filePath), record.id, {
          title: values.title,
          summary: values.summary,
          body: values.body,
          target: values.target,
          tags: commaSeparated(values.tags),
          aliases: commaSeparated(values.aliases),
          searchTerms: commaSeparated(values.searchTerms),
        });
        await onReload();
        await showToast(Toast.Style.Success, "Prompt Updated");
        pop();
      }}
    />
  );
}

function VersionHistory({
  directory,
  record,
  onRestore,
}: {
  directory: string;
  record: PromptRecord;
  onRestore: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [versions, setVersions] = useState<PromptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listPromptVersions(directory, record.id)
      .then(setVersions)
      .finally(() => setLoading(false));
  }, [directory, record.id]);

  async function restore(version: PromptRecord) {
    await restorePromptVersion(directory, record.id, version.filePath);
    await onRestore();
    await showToast(Toast.Style.Success, "Prompt Version Restored");
    pop();
  }

  return (
    <List
      isLoading={loading}
      isShowingDetail
      navigationTitle={`${record.title} History`}
    >
      {!loading && versions.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Earlier Versions"
          description="A version is saved automatically before each change."
        />
      ) : null}
      {versions.map((version) => (
        <List.Item
          key={version.filePath}
          icon={Icon.Clock}
          title={new Date(version.updatedAt).toLocaleString()}
          subtitle={version.title}
          detail={<PromptDetail record={version} />}
          actions={
            <ActionPanel>
              <Action
                title="Restore This Version"
                icon={Icon.ArrowCounterClockwise}
                onAction={() => restore(version)}
              />
              <Action.CopyToClipboard
                title="Copy This Version"
                content={version.body}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function formValues(record: PromptRecord): PromptFormValues {
  return {
    title: record.title,
    summary: record.summary,
    body: record.body,
    target: record.target,
    tags: record.tags.join(", "),
    aliases: record.aliases.join(", "),
    searchTerms: record.searchTerms.join(", "),
  };
}

function promptMarkdown(
  record: PromptRecord,
  stale = false,
  currentCommit?: string,
  matchReason?: string,
): string {
  const overview = [
    `**Use with:** ${targetTitle(record.target)}`,
    `**Updated:** ${new Date(record.updatedAt).toLocaleString()}`,
    ...(record.project
      ? [
          `**Project:** ${record.project.name}${record.project.branch ? ` (${record.project.branch})` : ""}`,
        ]
      : []),
    ...(matchReason ? [`**Matched by:** ${matchReason}`] : []),
  ].join("  \n");
  const sections = [
    `# ${record.title}`,
    `## What This Prompt Does\n\n${record.summary}`,
    overview,
  ];
  if (stale) {
    sections.push(
      `> Project context may be stale. Saved commit: \`${record.project?.commit}\`; current commit: \`${currentCommit}\`.`,
    );
  }
  sections.push(`## Full Prompt\n\n${record.body}`);
  return sections.join("\n\n");
}

function promptUpdate(
  record: PromptRecord,
  flags: Pick<PromptUpdate, "favorite" | "archived">,
): PromptUpdate {
  return {
    ...formValues(record),
    tags: record.tags,
    aliases: record.aliases,
    searchTerms: record.searchTerms,
    ...flags,
  };
}

function targetTitle(target: PromptRecord["target"]): string {
  if (target === "claude-code") return "Claude Code";
  return target.charAt(0).toUpperCase() + target.slice(1);
}
