import { useState } from "react";
import { Action, ActionPanel, Color, Icon, List, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { Source, Notebook } from "../types";
import { NotebookService, SummaryService } from "../services";
import { SourceDetail } from "./SourceDetail";

export function DeleteSource({
  notebookService,
  summaryService,
  notebook,
}: {
  notebookService: NotebookService;
  summaryService: SummaryService;
  notebook: Notebook;
}) {
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const { pop } = useNavigation();

  const notebooks = notebookService.notebooks;
  const sources = notebooks.find((nb) => nb.id === notebook.id)?.sources || [];

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSources((prev) => {
      if (prev.includes(sourceId)) {
        return prev.filter((id) => id !== sourceId);
      } else {
        return [...prev, sourceId];
      }
    });
  };

  return (
    <List isShowingDetail={sources.length > 0} navigationTitle="Delete Sources">
      {sources.map((source: Source) => (
        <List.Item
          key={source.id}
          icon={
            selectedSources.includes(source.id)
              ? { source: Icon.Checkmark, tintColor: Color.Red }
              : source.metadata.icon
          }
          title={source.title || "Untitled Source"}
          detail={<SourceDetail summaryService={summaryService} source={source} />}
          actions={
            <ActionPanel>
              <Action
                title={selectedSources.includes(source.id) ? "Deselect Source" : "Select Source"}
                icon={Icon.Checkmark}
                onAction={() => toggleSourceSelection(source.id)}
              />
              <Action
                title="Delete Selected Sources"
                icon={Icon.Trash}
                onAction={async () => {
                  if (selectedSources.length > 0) {
                    await confirmAlert({
                      title: "Delete Sources",
                      message: "Are you sure you want to delete the selected sources?",
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                        onAction: async () => {
                          pop();
                          await notebookService.delSources(selectedSources);
                        },
                      },
                    });
                  }
                }}
              />
              <Action
                title={selectedSources.length !== sources.length ? "Select All" : "Deselect All"}
                icon={Icon.Checkmark}
                onAction={() => {
                  if (selectedSources.length === sources.length) {
                    setSelectedSources([]);
                  } else {
                    setSelectedSources(sources.map((source: Source) => source.id));
                  }
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
