import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { Notebook, Ownership } from "../types";
import { useState, useEffect } from "react";
import { formatNavigationTitle } from "../utils/transformData";
import { EditSourceTitle, DeleteSource, SourceDetail, SelectSource } from "./";
import { NotebookService, SummaryService } from "../services";
import { showFailureToast } from "@raycast/utils";

export function SourceView(props: {
  notebookService: NotebookService;
  summaryService: SummaryService;
  notebook: Notebook;
}) {
  const { notebookService, summaryService, notebook } = props;
  const [isLoading, setLoading] = useState(false);
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | undefined>(() =>
    notebookService.notebooks.find((nb) => nb.id === notebook.id),
  );

  useEffect(() => {
    const unsubLoading = notebookService.subscribe("loading", (data) => {
      if (data && "scope" in data && data.scope === "notebooks" && "status" in data) {
        setLoading(data.status);
      }
    });

    const unsubNotebooks = notebookService.subscribe("notebooksUpdated", (data) => {
      if (data && Array.isArray(data)) {
        setCurrentNotebook(data.find((nb) => nb.id === notebook.id));
      }
    });

    return () => {
      unsubLoading();
      unsubNotebooks();
    };
  }, [notebook.id]);

  const sources = currentNotebook?.sources || [];

  return (
    <List isLoading={isLoading} isShowingDetail={sources.length > 0} navigationTitle={formatNavigationTitle(notebook)}>
      {sources.map((source) => {
        return (
          <List.Item
            key={source.id}
            icon={source.metadata.icon}
            title={source.title || "Untitled Source"}
            detail={<SourceDetail summaryService={summaryService} source={source} />}
            actions={
              <ActionPanel>
                {notebook.owned !== Ownership.Viewer && (
                  <SelectSource
                    notebookService={notebookService}
                    notebook={notebook}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                )}
                <Action.OpenInBrowser
                  title="Open Notebook"
                  url={"https://notebooklm.google.com/notebook/" + notebook.id}
                />
                {notebook.owned !== Ownership.Viewer && (
                  <Action.Push
                    title="Edit Source Title"
                    icon={Icon.Pencil}
                    target={<EditSourceTitle notebookService={notebookService} source={source} />}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  />
                )}
                {notebook.owned !== Ownership.Viewer && (
                  <Action.Push
                    title="Delete Sources"
                    icon={Icon.Trash}
                    target={
                      <DeleteSource
                        notebookService={notebookService}
                        summaryService={summaryService}
                        notebook={notebook}
                      />
                    }
                    shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                  />
                )}
                <ActionPanel.Section>
                  <Action
                    title="Reload Summary"
                    icon={Icon.RotateClockwise}
                    onAction={async () => {
                      try {
                        await notebookService.reloadSummary(notebook.id, source.id);
                      } catch (error) {
                        showFailureToast(error, { title: "Failed to reload summary" });
                      }
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  {(source.metadata.site_url || source.metadata.youtube_info?.url) && (
                    <Action.OpenInBrowser
                      title="Open Original Source"
                      icon={Icon.Link}
                      url={source.metadata.site_url?.[0] || source.metadata.youtube_info?.url || ""}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Notebook as JSON"
                    content={JSON.stringify(sources, null, 4)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      {sources.length === 0 && (
        <List.EmptyView
          title="No sources found"
          description="Add a source to get started"
          actions={
            <ActionPanel>
              <SelectSource
                notebookService={notebookService}
                notebook={notebook}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
              <Action.OpenInBrowser
                title="Open Notebook"
                url={"https://notebooklm.google.com/notebook/" + notebook.id}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
