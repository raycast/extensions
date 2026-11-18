import { List, ActionPanel, Action, Icon, Color, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { getHighlights, Highlight, deleteHighlight, syncHighlights, syncHighlightsDown } from "./utils/storage";
import { exportToMarkdown, exportToJSON, exportToCSV } from "./utils/export";
import { canUseAdvancedExport } from "./utils/feature-flags";
import { isProUser } from "./utils/auth";
import EditHighlight from "./edit-highlight";
import HighlightDetail from "./highlight-detail";
import { formatTime } from "./utils/format";

async function performExport(highlights: Highlight[], format: "markdown" | "json" | "csv") {
  switch (format) {
    case "markdown":
      await exportToMarkdown(highlights);
      break;
    case "json":
      await exportToJSON(highlights);
      break;
    case "csv":
      await exportToCSV(highlights);
      break;
  }
}

export default function Command() {
  const [state, setState] = useState<{ isLoading: boolean; highlights: Highlight[] }>({
    isLoading: true,
    highlights: [],
  });
  const [canExport, setCanExport] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    syncHighlightsDown().catch(() => {});

    fetchData();
  }, []);

  async function fetchData() {
    setState((s) => ({ ...s, isLoading: true }));
    const highlights = await getHighlights();
    const proStatus = await isProUser();
    setIsPro(proStatus);
    canUseAdvancedExport().then(setCanExport);

    if (proStatus) {
      syncHighlights().catch(() => {});
    }

    setState({ isLoading: false, highlights });
  }

  const refresh = async () => {
    setState((s) => ({ ...s, isLoading: true }));
    const highlights = await getHighlights();
    const proStatus = await isProUser();
    setIsPro(proStatus);

    if (proStatus) {
      syncHighlights().catch(() => {});
    }

    setState({ isLoading: false, highlights });
  };

  useEffect(() => {
    refresh();
  }, []);

  const VIEW_LIMIT = 10;
  const visibleHighlights = isPro ? state.highlights : state.highlights.slice(0, VIEW_LIMIT);
  const hiddenCount = Math.max(0, state.highlights.length - visibleHighlights.length);

  const selectedItemId = visibleHighlights.length > 0 ? visibleHighlights[0].id : undefined;

  const handleDelete = async (id: string) => {
    if (
      await confirmAlert({
        title: "Delete Highlight?",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await deleteHighlight(id);
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
      refresh();
    }
  };

  const handleExport = async (format: "markdown" | "json" | "csv") => {
    if (!canExport && format !== "markdown") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Upgrade to Pro",
        message: "Advanced export formats are for Pro users.",
      });
      return;
    }
    try {
      await performExport(visibleHighlights, format);
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Export Failed", message: String(e) });
    }
  };

  const handleExportAll = async () => {
    try {
      await exportToMarkdown(state.highlights);
      await showToast({ style: Toast.Style.Success, title: "Export Successful" });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Export Failed", message: String(e) });
    }
  };

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Search highlights by text or video title..."
      selectedItemId={selectedItemId}
    >
      {state.highlights.length === 0 && !state.isLoading ? (
        <List.EmptyView
          title="No highlights yet"
          description="Run 'Create Highlight' to capture moments from YouTube videos."
          icon={Icon.Bookmark}
        />
      ) : (
        <>
          {visibleHighlights.map((highlight) => {
            const videoUrl = highlight.videoUrl || "";
            const separator = videoUrl.includes("?") ? "&" : "?";
            const timestampUrl = videoUrl ? `${videoUrl}${separator}t=${Math.floor(highlight.startTime || 0)}s` : "";

            const title = highlight.text || highlight.videoTitle || "Untitled Highlight";
            const subtitle = `${formatTime(highlight.startTime)} - ${formatTime(highlight.endTime)}`;

            return (
              <List.Item
                key={highlight.id}
                id={highlight.id}
                title={title}
                subtitle={subtitle}
                icon={{ source: Icon.Bookmark, tintColor: Color.Yellow }}
                accessories={[{ date: new Date(highlight.createdAt || 0), tooltip: "Created At" }]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      {timestampUrl && <Action.OpenInBrowser url={timestampUrl} title="Open in Browser" />}
                      <Action.Push
                        title="Show Details"
                        icon={Icon.Eye}
                        target={<HighlightDetail highlight={highlight} />}
                        shortcut={{ modifiers: ["cmd"], key: "return" }}
                      />
                      <Action.Push
                        title="Edit Highlight"
                        icon={Icon.Pencil}
                        target={<EditHighlight highlight={highlight} onEdit={refresh} />}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                      <Action.CopyToClipboard
                        content={highlight.text || ""}
                        title="Copy Highlight Text"
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      {timestampUrl && (
                        <Action.CopyToClipboard
                          content={timestampUrl}
                          title="Copy Link"
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Management">
                      <Action
                        title="Delete Highlight"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(highlight.id)}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Export">
                      <Action
                        title="Export to Markdown"
                        icon={Icon.Document}
                        onAction={() => handleExport("markdown")}
                      />
                      {canExport && (
                        <>
                          <Action title="Export to JSON" icon={Icon.Code} onAction={() => handleExport("json")} />
                          <Action title="Export to CSV" icon={Icon.List} onAction={() => handleExport("csv")} />
                        </>
                      )}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}

          {/* Footer for Free Users */}
          {!isPro && hiddenCount > 0 && (
            <List.Item
              title={`Export to Markdown to view all ${state.highlights.length} highlights`}
              icon={Icon.Download}
              accessories={[{ text: `${hiddenCount} more hidden` }]}
              actions={
                <ActionPanel>
                  <Action title="Export All to Markdown" icon={Icon.Download} onAction={handleExportAll} />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
