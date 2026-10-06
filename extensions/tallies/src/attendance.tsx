import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { BackupActions } from "./components/backup-actions";
import { AttendanceDetail } from "./components/attendance-detail";
import { excelClipboard } from "./lib/excel";
import { EntryForm } from "./components/entry-form";
import { TimeInForm } from "./components/time-in-form";
import { renderNote, timeOutLabel } from "./lib/markdown";
import { defaultTimeIn, deleteEntry, replaceTemplateEntries, templateEntries, templateName } from "./lib/roster";
import { rememberSelectedTemplate, reportError, useStore, type SaveStore } from "./lib/storage";
import { timeFromDate } from "./lib/time";
import type { Entry, Store } from "./lib/types";

async function copy(content: string | Clipboard.Content, title: string) {
  try {
    await Clipboard.copy(content);
    await showToast({ style: Toast.Style.Success, title });
  } catch (error) {
    await reportError("Could Not Copy", error);
  }
}
function AttendanceActions({ data, save, entry }: { data: Store; save: SaveStore; entry?: Entry }) {
  const templateId = data.selectedTemplateId;
  const entries = templateEntries(data, templateId);
  const template = data.templates.find((item) => item.id === templateId)!;
  async function remove(scope: "entry" | "template" | "all") {
    const message =
      scope === "entry"
        ? `Delete ${entry?.name} from ${templateName(template)}?`
        : scope === "template"
          ? `Delete all ${entries.length} entries from ${templateName(template)}? Other templates will keep their entries.`
          : `Delete all ${data.entries.length} entries across every template? Saved templates will be kept.`;
    if (
      !(await confirmAlert({
        title: "Delete Attendance Entries?",
        message,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    await save(
      (store) =>
        scope === "entry" && entry
          ? deleteEntry(store, entry.id)
          : scope === "template"
            ? replaceTemplateEntries(store, templateId, [])
            : { ...store, entries: [] },
      "Entries Deleted",
    );
  }
  return (
    <ActionPanel>
      <Action.Push title="Add Entry" icon={Icon.Plus} target={<EntryForm data={data} save={save} />} />
      {entry && (
        <ActionPanel.Section>
          <Action.Push
            title="Edit Entry"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["shift"], key: "enter" }}
            target={<EntryForm entry={entry} data={data} save={save} />}
          />
          {entry.status === "clocked_out" ? (
            <Action.Push
              title="Edit Time"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
              target={<EntryForm entry={entry} data={data} save={save} />}
            />
          ) : (
            <Action
              title="Clocked out"
              icon={Icon.Clock}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
              onAction={async () => {
                await save(
                  (store) => ({
                    ...store,
                    entries: store.entries.map((item) =>
                      item.id === entry.id
                        ? {
                            ...item,
                            status: "clocked_out",
                            timeIn: item.status === "no_show" ? defaultTimeIn(store, item.templateId) : item.timeIn,
                            timeOut: timeFromDate(new Date()),
                          }
                        : item,
                    ),
                  }),
                  "Clock-Out Saved",
                );
              }}
            />
          )}
          <Action
            title="Mark No Show"
            icon={Icon.Person}
            shortcut={
              {
                macOS: { modifiers: ["cmd", "shift"], key: "n" },
                Windows: { modifiers: ["ctrl", "shift"], key: "n" },
              } as unknown as Keyboard.Shortcut
            }
            onAction={async () => {
              await save(
                (store) => ({
                  ...store,
                  entries: store.entries.map((item) =>
                    item.id === entry.id ? { ...item, status: "no_show", timeOut: "" } : item,
                  ),
                }),
                "No Show Saved",
              );
            }}
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section>
        <Action.Push
          title="Set Time in"
          icon={Icon.Clock}
          target={<TimeInForm templateId={templateId} sharedTimeIn={defaultTimeIn(data, templateId)} save={save} />}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title={templateName(template)}>
        <Action
          title="Copy as Table"
          icon={Icon.Clipboard}
          shortcut={Keyboard.Shortcut.Common.Copy}
          onAction={() =>
            copy(excelClipboard(entries.filter((item) => item.status !== "no_show")), "Template Table Copied")
          }
        />
        <Action
          title="Copy No Shows as Table"
          icon={Icon.Clipboard}
          onAction={() =>
            copy(excelClipboard(entries.filter((item) => item.status === "no_show")), "No Shows Table Copied")
          }
        />
        {entry && (
          <Action
            title="Copy Entry Note"
            icon={Icon.Clipboard}
            onAction={() => copy(renderNote(entry), "Entry Note Copied")}
          />
        )}
      </ActionPanel.Section>
      <BackupActions data={data} save={save} />
      <ActionPanel.Section title="Delete Entries">
        {entry && (
          <Action
            title="Delete Entry"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => remove("entry")}
          />
        )}
        {entries.length > 0 && (
          <Action
            title="Delete All Entries in This Template"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => remove("template")}
          />
        )}
        {data.entries.length > 0 && (
          <Action
            title="Delete All Entries Across Templates"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => remove("all")}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
export default function AttendanceCommand() {
  const { data, isLoading, isSaving, save } = useStore();
  const [selectedId, setSelectedId] = useState<string>();
  const entries = data ? templateEntries(data, data.selectedTemplateId) : [];
  const template = data?.templates.find((item) => item.id === data.selectedTemplateId);
  return (
    <List
      isShowingDetail
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      isLoading={isLoading || isSaving}
      searchBarPlaceholder="Search this template by name or login"
      searchBarAccessory={
        data ? (
          <List.Dropdown
            id="attendance-template"
            tooltip="Select Template"
            defaultValue={data.selectedTemplateId}
            onChange={async (id) => {
              if (id !== data.selectedTemplateId) {
                if (await save((store) => ({ ...store, selectedTemplateId: id }), "Template Selected")) {
                  rememberSelectedTemplate(id);
                }
              }
            }}
          >
            {data.templates.map((template) => (
              <List.Dropdown.Item key={template.id} value={template.id} title={templateName(template)} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
      actions={data ? <AttendanceActions data={data} save={save} /> : undefined}
    >
      {data &&
        entries.map((entry) => (
          <List.Item
            key={entry.id}
            id={entry.id}
            title={entry.name}
            subtitle={entry.login}
            keywords={[entry.login]}
            accessories={entry.status === "present" ? [] : [{ text: timeOutLabel(entry) }]}
            detail={<AttendanceDetail template={template} entries={entries} selectedId={entry.id} />}
            actions={<AttendanceActions data={data} save={save} entry={entry} />}
          />
        ))}
      {data && entries.length === 0 && (
        <List.Item
          id="empty-roster"
          title="No Entries in This Template"
          subtitle="Add an entry to get started"
          icon={Icon.Person}
          detail={<AttendanceDetail template={template} entries={[]} />}
          actions={<AttendanceActions data={data} save={save} />}
        />
      )}
      <List.EmptyView
        title={isLoading ? "Loading Attendance" : data ? "No Entries in This Template" : "Could Not Load Attendance"}
        description={
          data
            ? "Add a new entry or switch templates using the dropdown. Every template keeps its own roster."
            : "Close and reopen this command to retry."
        }
        icon={Icon.Person}
      />
    </List>
  );
}
