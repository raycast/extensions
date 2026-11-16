import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  filterSnippets,
  migrationReport,
  restoreSnippet,
  reviewSnippets,
  selectSnippets,
  updateSnippet,
} from "../lib/migration";
import { saveProgress } from "../lib/session-storage";
import type { MigrationSession, PreviewSnippet } from "../lib/types";
import { ConflictResolver, EditSnippetForm, GroupNameForm } from "./review-forms";
import { ExportForm } from "./export-form";
import { textPreview } from "./shared";

const filters = [
  { value: "all", title: "All Snippets" },
  { value: "ready", title: "Ready to Import" },
  { value: "warnings", title: "Needs Review" },
  { value: "conflicts", title: "Keyword Conflicts" },
  { value: "macro", title: "Unconverted Macros" },
  { value: "script", title: "Scripts" },
  { value: "rich", title: "Rich Text" },
  { value: "invalid-keyword", title: "Invalid Keywords" },
  { value: "selected", title: "Selected" },
  { value: "excluded", title: "Excluded" },
];

export function SnippetPreview({ initialSession }: { initialSession: MigrationSession }) {
  const { push } = useNavigation();
  const [session, setSession] = useState(initialSession);
  const [group, setGroup] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const items = useMemo(() => reviewSnippets(session), [session]);
  const sourceItems = useMemo(
    () => new Map(session.conversion.snippets.map((item) => [item.id, item])),
    [session.conversion],
  );
  const visible = useMemo(
    () => filterSnippets(items, { group, filter, search, selectedIds: session.selectedIds }),
    [items, group, filter, search, session.selectedIds],
  );
  const selected = new Set(session.selectedIds);
  const groups = [...new Set(items.map((item) => item.group))].sort();
  const skipped = session.conversion.suggestedCount + session.conversion.emptyCount + session.conversion.duplicateCount;
  const report = useMemo(() => migrationReport(session), [session]);
  const reportMarkdown = `## Migration summary\n\n- ${selected.size} selected across all groups\n- ${items.length - selected.size} excluded by selection\n- ${skipped} skipped during conversion\n- ${items.filter((entry) => entry.warnings.some((warning) => warning.level === "warning")).length} need review\n\n${session.referencePath ? "Keyword conflicts include the supplied Raycast export. Your live library is not changed." : "To compare with your existing library, supply a Raycast export on the source form."}\n\n### Report preview\n\n${textPreview(JSON.stringify(report, null, 2))}`;

  async function save() {
    try {
      await saveProgress(session);
      await showToast({
        style: Toast.Style.Success,
        title: "Progress Saved on This Mac",
        message: "Resume this snapshot from the source form. Source files are not re-read when resuming.",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Save Progress" });
    }
  }

  function exportSelected() {
    if (!selected.size) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Select at Least One Snippet",
        message: "You can still export a migration report from the action panel.",
      });
      return;
    }
    push(<ExportForm session={session} />);
  }

  function actions(item?: PreviewSnippet) {
    const sourceItem = item ? sourceItems.get(item.id) : undefined;
    const hasConflict = item?.warnings.some(
      (warning) => warning.code === "keyword-conflict" || warning.code === "existing-conflict",
    );
    return (
      <ActionPanel>
        <ActionPanel.Section>
          {item && (
            <Action
              title={selected.has(item.id) ? "Exclude Snippet" : "Include Snippet"}
              icon={selected.has(item.id) ? Icon.MinusCircle : Icon.PlusCircle}
              onAction={() =>
                setSession((current) => selectSnippets(current, [item.id], !current.selectedIds.includes(item.id)))
              }
            />
          )}
          <Action title={`Export ${selected.size} Selected Snippets`} icon={Icon.Download} onAction={exportSelected} />
          {item && (
            <Action.Push
              title="Edit Snippet"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={
                <EditSnippetForm
                  item={item}
                  onSave={(snippet) => setSession((current) => updateSnippet(current, item.id, snippet))}
                />
              }
            />
          )}
          {item?.snippet.keyword && hasConflict && (
            <Action.Push
              title="Resolve Keyword Conflict"
              icon={Icon.Warning}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
              target={
                <ConflictResolver initialSession={session} keyword={item.snippet.keyword} onChange={setSession} />
              }
            />
          )}
          <Action
            title="Save Progress"
            icon={Icon.SaveDocument}
            shortcut={item ? Keyboard.Shortcut.Common.Save : undefined}
            onAction={save}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Selection">
          <Action
            title={`Include ${visible.length} Matching Snippets`}
            icon={Icon.CheckCircle}
            onAction={() =>
              setSession((current) =>
                selectSnippets(
                  current,
                  visible.map((entry) => entry.id),
                  true,
                ),
              )
            }
          />
          <Action
            title={`Exclude ${visible.length} Matching Snippets`}
            icon={Icon.MinusCircle}
            onAction={() =>
              setSession((current) =>
                selectSnippets(
                  current,
                  visible.map((entry) => entry.id),
                  false,
                ),
              )
            }
          />
          <Action
            title="Select All Snippets"
            icon={Icon.CheckCircle}
            onAction={() =>
              setSession((current) =>
                selectSnippets(
                  current,
                  items.map((entry) => entry.id),
                  true,
                ),
              )
            }
          />
          <Action
            title="Deselect All Snippets"
            icon={Icon.Circle}
            onAction={() => setSession((current) => ({ ...current, selectedIds: [] }))}
          />
          <ActionPanel.Submenu title="Filter by Group" icon={Icon.Folder}>
            <Action title="All Groups" onAction={() => setGroup("")} />
            {groups.map((name) => (
              <Action key={name} title={name} onAction={() => setGroup(name)} />
            ))}
          </ActionPanel.Submenu>
          {(group || search || filter !== "all") && (
            <Action
              title="Clear All Filters"
              icon={Icon.XMarkCircle}
              onAction={() => {
                setGroup("");
                setSearch("");
                setFilter("all");
              }}
            />
          )}
        </ActionPanel.Section>
        {item && (
          <ActionPanel.Section title="Review">
            <Action.Push
              title="View Original and Converted Snippet"
              icon={Icon.Eye}
              target={
                <Detail
                  navigationTitle="Original and Converted"
                  markdown={`### Original source\n\n${textPreview(JSON.stringify(item.original, null, 2))}\n\n### Current export\n\n${textPreview(JSON.stringify(item.snippet, null, 2))}`}
                />
              }
            />
            <Action
              title="Restore Source Snippet"
              icon={Icon.ArrowCounterClockwise}
              onAction={() => setSession((current) => updateSnippet(current, item.id, item.original))}
            />
            {session.edits[item.id] && (
              <Action
                title="Reset Edits to Initial Conversion"
                icon={Icon.ArrowCounterClockwise}
                onAction={() => setSession((current) => restoreSnippet(current, item.id))}
              />
            )}
            {sourceItem && (
              <Action.Push
                title="Rename Group"
                icon={Icon.Folder}
                target={
                  <GroupNameForm
                    group={sourceItem.group}
                    currentName={item.group}
                    onSave={(name) => {
                      setSession((current) => ({
                        ...current,
                        groupNames: { ...current.groupNames, [sourceItem.group]: name },
                      }));
                      if (group === item.group) setGroup(name);
                    }}
                  />
                }
              />
            )}
            <Action.CopyToClipboard
              title="Copy Converted Text"
              content={item.snippet.text}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        )}
        <ActionPanel.Section title="Migration">
          <Action.Push
            title="View Migration Report"
            icon={Icon.Info}
            target={<Detail navigationTitle="Migration Report" markdown={reportMarkdown} />}
          />
          <Action.Push
            title="Export Migration Report"
            icon={Icon.Document}
            target={<ExportForm session={session} reportOnly />}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  return (
    <List
      navigationTitle="Preview Snippets"
      searchBarPlaceholder="Search names, keywords, groups, or content..."
      filtering={false}
      searchText={search}
      onSearchTextChange={setSearch}
      isShowingDetail
      actions={actions()}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Review Status" value={filter} onChange={setFilter}>
          {filters.map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={items.length ? "No Matching Snippets" : "No Snippets to Export"}
        icon={Icon.Document}
        description={
          items.length
            ? "Change the search or filters from the action panel. Your selection is kept."
            : `${skipped} snippets skipped. Export a report for details or choose another source.`
        }
      />
      <List.Section
        title={`${selected.size} of ${items.length} selected`}
        subtitle={`${group || "All Groups"} · ${visible.length} shown · ${skipped} skipped`}
      >
        {visible.map((item) => (
          <List.Item
            key={item.id}
            id={item.id}
            title={item.snippet.name}
            subtitle={item.snippet.keyword}
            icon={{
              source: selected.has(item.id) ? Icon.CheckCircle : Icon.Circle,
              tintColor: selected.has(item.id) ? Color.Green : Color.SecondaryText,
            }}
            accessories={
              item.warnings.length
                ? [
                    {
                      icon: {
                        source: item.warnings.some((warning) => warning.level === "warning") ? Icon.Warning : Icon.Info,
                        tintColor: item.warnings.some((warning) => warning.level === "warning")
                          ? Color.Orange
                          : Color.SecondaryText,
                      },
                      tooltip: item.warnings.map((warning) => warning.message).join("\n"),
                    },
                  ]
                : []
            }
            detail={
              <List.Item.Detail
                markdown={`${item.warnings.map((warning) => `> ${warning.message}`).join("\n\n")}\n\n${textPreview(item.snippet.text)}${item.changes.length ? `\n\n### Changes\n\n${textPreview(item.changes.join("\n"))}` : ""}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Group" text={item.group} />
                    <List.Item.Detail.Metadata.Label title="Keyword" text={item.snippet.keyword || "None"} />
                    <List.Item.Detail.Metadata.Label title="Source Type" text={item.kind} />
                    <List.Item.Detail.Metadata.Label
                      title="Export"
                      text={selected.has(item.id) ? "Included" : "Excluded"}
                    />
                    {item.sourcePath && <List.Item.Detail.Metadata.Label title="Source" text={item.sourcePath} />}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={actions(item)}
          />
        ))}
      </List.Section>
    </List>
  );
}
