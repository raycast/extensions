import { useEffect, useRef, useState } from "react";
import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { Browser, BrowserList, Notebook, Ownership } from "./types";
import { getNotebookService, getSummaryService } from "./services";
import { SelectSource, EditNotebookTitle, SourceView, DeleteNotebook, BrowserReselect } from "./component";
import { showFailureToast } from "@raycast/utils";

const notebookService = getNotebookService();
const summaryService = getSummaryService();

export default function Command() {
  if (!BrowserList[Browser]) {
    return <BrowserReselect />;
  }

  const hasLoaded = useRef(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => notebookService.notebooks);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasLoaded.current) {
      notebookService.getNotebooks();
      hasLoaded.current = true;
    }
  }, [notebookService]);

  useEffect(() => {
    const unsubLoading = notebookService.subscribe("loading", (data) => {
      if (data && "scope" in data && data.scope === "notebooks" && "status" in data) {
        setLoading(data.status);
      }
    });

    const unsubNotebooks = notebookService.subscribe("notebooksUpdated", (data) => {
      if (data && Array.isArray(data)) {
        setNotebooks(data);
      }
    });

    return () => {
      unsubLoading();
      unsubNotebooks();
    };
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle={`NotebookLM (${notebooks.length}/50)`}>
      {notebooks.length > 0 ? (
        notebooks.map((notebook: Notebook) => (
          <List.Item
            key={notebook.id}
            icon={notebook.icon}
            title={{ value: notebook.title || "Untitled Notebook", tooltip: notebook.created_at }}
            accessories={[
              notebook.shared
                ? notebook.owned === Ownership.Viewer
                  ? {
                      icon: Icon.Eye,
                      tooltip: Ownership[notebook.owned],
                    }
                  : {
                      icon: Icon.TwoPeople,
                      tooltip: Ownership[notebook.owned],
                    }
                : {},
              { tag: `+ ${notebook.sources?.length || 0}` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Sources"
                  icon={Icon.List}
                  target={
                    <SourceView notebookService={notebookService} summaryService={summaryService} notebook={notebook} />
                  }
                />
                <Action.OpenInBrowser
                  title="Open Notebook"
                  url={"https://notebooklm.google.com/notebook/" + notebook.id}
                />
                <SelectSource
                  notebookService={notebookService}
                  notebook={null}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
                {notebook.owned !== Ownership.Viewer && (
                  <SelectSource
                    notebookService={notebookService}
                    notebook={notebook}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  />
                )}
                <Action.Push
                  title="Edit Notebook Title"
                  icon={Icon.Pencil}
                  target={<EditNotebookTitle notebookService={notebookService} notebook={notebook} />}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                />
                <Action.Push
                  title="Delete Notebooks"
                  icon={Icon.Trash}
                  target={<DeleteNotebook notebookService={notebookService} />}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                />
                <ActionPanel.Section>
                  <Action
                    title="Refresh Notebooks"
                    icon={Icon.RotateClockwise}
                    onAction={async () => {
                      try {
                        await notebookService.getNotebooks();
                      } catch (error) {
                        showFailureToast(error, { title: "Failed to refresh notebooks" });
                      }
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Reset All Summaries"
                    icon={Icon.RotateClockwise}
                    onAction={async () => {
                      await notebookService.resetAllSummaries();
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy All Notebooks as JSON"
                    icon={Icon.Clipboard}
                    content={JSON.stringify(notebooks, null, 4)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="No notebooks found"
          actions={
            <ActionPanel>
              <SelectSource
                notebookService={notebookService}
                notebook={null}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action.OpenInBrowser title="Open Notebook" url={"https://notebooklm.google.com/notebook/"} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
