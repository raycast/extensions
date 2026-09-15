import { useEffect, useState } from "react";
import { readFile } from "node:fs/promises";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Form,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { WorkItem } from "./components/work-item";
import {
  clearSearchHistory,
  createLibrary,
  deleteLibrary,
  exportLibraryJson,
  importLibraryJson,
  loadLibrary,
  loadLibraryNames,
  loadSearchHistory,
  removeWork,
  updateSavedWork,
  type SavedWork,
  type SearchHistoryItem,
} from "./lib/library";
import { LocalDocumentItem } from "./components/local-document-item";
import { indexProgress, loadLocalIndex } from "./local-library/storage";
import type { LocalDocument } from "./local-library/types";

export default function Command() {
  const { push } = useNavigation();
  const [items, setItems] = useState<SavedWork[]>([]);
  const [libraries, setLibraries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [localDocuments, setLocalDocuments] = useState<LocalDocument[]>([]);
  const [localProgress, setLocalProgress] = useState(0);
  const reload = () =>
    void Promise.all([
      loadLibrary(),
      loadLibraryNames(),
      loadSearchHistory(),
      loadLocalIndex(),
    ]).then(([works, names, searches, localIndex]) => {
      setItems(works);
      setLibraries(names);
      setHistory(searches);
      setLocalDocuments(localIndex.documents);
      setLocalProgress(indexProgress(localIndex).percent);
      setIsLoading(false);
    });
  useEffect(reload, []);

  const copyExport = async (library?: string) => {
    await Clipboard.copy(await exportLibraryJson(library));
    await showToast({
      style: Toast.Style.Success,
      title: library
        ? `${library} copied as Academic JSON`
        : "All libraries copied as Academic JSON",
    });
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={items.length > 0 || localDocuments.length > 0}
      navigationTitle="Academic Library"
      searchBarPlaceholder="Filter libraries, works and tags…"
    >
      {!items.length &&
      !history.length &&
      !localDocuments.length &&
      !isLoading ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="Your research libraries are empty"
          description="Create a library or save a work from Search, Find or Bib."
          actions={
            <ActionPanel>
              <Action
                title="Create Library"
                icon={Icon.Plus}
                onAction={() => push(<CreateLibraryForm reload={reload} />)}
              />
              <Action
                title="Import Academic JSON"
                icon={Icon.Upload}
                onAction={() => push(<ImportLibraryForm reload={reload} />)}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {localDocuments.length ? (
        <List.Section
          title="Local Documents"
          subtitle={`${localProgress}% indexed · ${localDocuments.length} files`}
        >
          {localDocuments.slice(0, 500).map((document) => (
            <LocalDocumentItem
              key={document.id}
              document={document}
              reload={reload}
            />
          ))}
        </List.Section>
      ) : null}
      {group(libraries, items).map(([library, entries]) => (
        <List.Section
          key={library}
          title={library}
          subtitle={`${entries.length} saved`}
        >
          <List.Item
            id={`manage:${library}`}
            title={`Manage ${library}`}
            subtitle="Create, import, export or delete a library"
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action
                  title="Create New Library"
                  icon={Icon.Plus}
                  onAction={() => push(<CreateLibraryForm reload={reload} />)}
                />
                <Action
                  title="Import Academic JSON"
                  icon={Icon.Upload}
                  onAction={() => push(<ImportLibraryForm reload={reload} />)}
                />
                <Action
                  title="Copy This Library as JSON"
                  icon={Icon.Download}
                  onAction={() => copyExport(library)}
                />
                <Action
                  title="Copy All Libraries as JSON"
                  icon={Icon.Download}
                  onAction={() => copyExport()}
                />
                {library !== "Reading List" ? (
                  <Action
                    title="Delete Library and Its Works"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: `Delete “${library}”?`,
                        message: `This removes the library and its ${entries.length} saved work${entries.length === 1 ? "" : "s"}. Export it first if needed.`,
                        primaryAction: {
                          title: "Delete",
                          style: Alert.ActionStyle.Destructive,
                        },
                      });
                      if (confirmed) {
                        await deleteLibrary(library);
                        reload();
                      }
                    }}
                  />
                ) : null}
              </ActionPanel>
            }
          />
          {entries.map((entry) => (
            <SavedItem
              key={entry.work.id}
              entry={entry}
              libraries={libraries}
              reload={reload}
            />
          ))}
        </List.Section>
      ))}
      {history.length ? (
        <List.Section
          title="Recent Searches"
          subtitle={`${history.length} queries`}
        >
          {history.map((item) => (
            <List.Item
              key={`${item.searchedAt}:${item.request.text}`}
              title={item.request.advanced?.title ?? item.request.text}
              subtitle={
                item.request.advanced
                  ? "Advanced search"
                  : new Date(item.searchedAt).toLocaleString()
              }
              icon={Icon.MagnifyingGlass}
              actions={
                <ActionPanel>
                  <Action
                    title="Run Search Again"
                    icon={Icon.MagnifyingGlass}
                    onAction={() =>
                      launchCommand({
                        name: "search-library",
                        type: LaunchType.UserInitiated,
                        context: { query: item.request.text },
                      })
                    }
                  />
                  <Action
                    title="Clear Search History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      await clearSearchHistory();
                      reload();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function SavedItem({
  entry,
  libraries,
  reload,
}: {
  entry: SavedWork;
  libraries: string[];
  reload: () => void;
}) {
  const { push } = useNavigation();
  return (
    <WorkItem
      work={entry.work}
      savedActions={{
        onEdit: () =>
          push(
            <EditSavedWork
              entry={entry}
              libraries={libraries}
              reload={reload}
            />,
          ),
        onRemove: async () => {
          await removeWork(entry.work.id);
          reload();
        },
      }}
    />
  );
}

function EditSavedWork({
  entry,
  libraries,
  reload,
}: {
  entry: SavedWork;
  libraries: string[];
  reload: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Organize Saved Work"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values: {
              library: string;
              newLibrary: string;
              tags: string;
            }) => {
              const library =
                values.newLibrary.trim() || values.library || "Reading List";
              await updateSavedWork(
                entry.work.id,
                library,
                values.tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              );
              await showToast({
                style: Toast.Style.Success,
                title: `Moved to ${library}`,
              });
              reload();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="library"
        title="Library"
        defaultValue={entry.collection}
      >
        {libraries.map((library) => (
          <Form.Dropdown.Item key={library} value={library} title={library} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="newLibrary"
        title="Or Create Library"
        placeholder="New library name"
      />
      <Form.TextField
        id="tags"
        title="Tags"
        defaultValue={entry.tags.join(", ")}
        placeholder="thesis, methodology, read"
      />
    </Form>
  );
}

function CreateLibraryForm({ reload }: { reload: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Create Library"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Library"
            icon={Icon.Plus}
            onSubmit={async (values: { name: string }) => {
              const name = values.name.trim();
              if (!name) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Enter a library name",
                });
                return;
              }
              await createLibrary(name);
              reload();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Library Name"
        placeholder="Article, thesis, project, seminar…"
      />
    </Form>
  );
}

function ImportLibraryForm({ reload }: { reload: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Import Academic Library"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            icon={Icon.Upload}
            onSubmit={async (values: { files: string[] }) => {
              const path = values.files?.[0];
              if (!path) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Choose an Academic JSON file",
                });
                return;
              }
              try {
                const result = await importLibraryJson(
                  await readFile(path, "utf8"),
                );
                await showToast({
                  style: Toast.Style.Success,
                  title: `Imported ${result.works} work${result.works === 1 ? "" : "s"}`,
                  message: `${result.libraries} libraries available`,
                });
                reload();
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not import this file",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Academic JSON"
        text="Imports an export copied from Academic. Existing works with the same DOI, ISBN or internal ID are updated."
      />
      <Form.FilePicker
        id="files"
        title="JSON File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
    </Form>
  );
}

function group(
  libraries: string[],
  items: SavedWork[],
): Array<[string, SavedWork[]]> {
  return libraries.map((library) => [
    library,
    items.filter((item) => item.collection === library),
  ]);
}
