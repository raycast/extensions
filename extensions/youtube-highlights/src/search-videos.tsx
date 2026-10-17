import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getHighlights, Highlight, mergeHighlights, deleteHighlight, getVideoId } from "./utils/storage";
import { exportToMarkdown, exportToJSON, exportToCSV } from "./utils/export";
import { canUseAdvancedExport } from "./utils/feature-flags";
import { isProUser } from "./utils/auth";
import EditHighlight from "./edit-highlight";
import HighlightDetail from "./highlight-detail";
import VideoStats from "./video-stats";
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

interface VideoGroup {
  id: string; // videoId
  title: string;
  url: string;
  highlights: Highlight[];
  lastUpdated: number;
}

function VideoDetail({ group, onRefresh }: { group: VideoGroup; onRefresh: () => void }) {
  const { pop } = useNavigation();
  const [canExport, setCanExport] = useState(false);

  useEffect(() => {
    canUseAdvancedExport().then(setCanExport);
  }, []);

  const handleMerge = async () => {
    if (group.highlights.length < 2) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to merge",
        message: "Need at least 2 highlights.",
      });
      return;
    }

    if (
      await confirmAlert({
        title: `Merge ${group.highlights.length} Highlights?`,
        message: "This will combine all highlights for this video into one.",
        primaryAction: { title: "Merge", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await mergeHighlights(group.highlights.map((h) => h.id));
      await showToast({ style: Toast.Style.Success, title: "Merged Successfully" });
      onRefresh();
      pop(); // Go back to refresh list
    }
  };

  const handleDelete = async (id: string) => {
    if (
      await confirmAlert({
        title: "Delete Highlight?",
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await deleteHighlight(id);
      await showToast({ style: Toast.Style.Success, title: "Deleted" });
      onRefresh();
      pop();
    }
  };

  const handleExport = async (format: "markdown" | "json" | "csv", highlight?: Highlight) => {
    if (!canExport && format !== "markdown") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Upgrade to Pro",
        message: "Advanced export formats are for Pro users.",
      });
      return;
    }
    try {
      const list = highlight ? [highlight] : group.highlights;
      await performExport(list, format);
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Export Failed", message: String(e) });
    }
  };

  return (
    <List navigationTitle={group.title} searchBarPlaceholder="Search highlights in this video...">
      {group.highlights.map((highlight) => {
        const videoUrl = highlight.videoUrl || "";
        const separator = videoUrl.includes("?") ? "&" : "?";
        const timestampUrl = videoUrl ? `${videoUrl}${separator}t=${Math.floor(highlight.startTime || 0)}s` : "";

        const title = highlight.text || highlight.videoTitle || "Untitled Highlight";

        return (
          <List.Item
            key={highlight.id}
            title={title}
            subtitle={`${formatTime(highlight.startTime)} - ${formatTime(highlight.endTime)}`}
            icon={Icon.Bookmark}
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
                    target={<EditHighlight highlight={highlight} onEdit={onRefresh} />}
                  />
                  <Action.CopyToClipboard content={`${highlight.videoTitle}\n${timestampUrl}`} title="Copy Link" />
                </ActionPanel.Section>

                <ActionPanel.Section title="Management">
                  <Action title="Merge All Overlapping" icon={Icon.TwoArrowsClockwise} onAction={handleMerge} />
                  <Action
                    title="Delete Highlight"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(highlight.id)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Export Highlight">
                  <Action
                    title="Export to Markdown"
                    icon={Icon.Document}
                    onAction={() => handleExport("markdown", highlight)}
                  />
                  {canExport && (
                    <>
                      <Action
                        title="Export to JSON"
                        icon={Icon.Code}
                        onAction={() => handleExport("json", highlight)}
                      />
                      <Action title="Export to CSV" icon={Icon.List} onAction={() => handleExport("csv", highlight)} />
                    </>
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  const [state, setState] = useState<{ isLoading: boolean; groups: VideoGroup[] }>({
    isLoading: true,
    groups: [],
  });
  const [canExport, setCanExport] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    canUseAdvancedExport().then(setCanExport);
  }, []);

  const refresh = async () => {
    setState((s) => ({ ...s, isLoading: true }));
    const highlights = await getHighlights();
    const proStatus = await isProUser();
    setIsPro(proStatus);

    const groupsMap = new Map<string, VideoGroup>();

    highlights.forEach((h) => {
      let key = h.videoId;

      if (!key && h.videoUrl) {
        key = getVideoId(h.videoUrl);
      }

      key = key || "unknown";

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          id: key,
          title: h.videoTitle || "Unknown Video",
          url: h.videoUrl || "",
          highlights: [],
          lastUpdated: 0,
        });
      }
      const group = groupsMap.get(key)!;
      group.highlights.push(h);
      if (h.createdAt > group.lastUpdated) {
        group.lastUpdated = h.createdAt;
      }
    });

    const groups = Array.from(groupsMap.values()).sort((a, b) => b.lastUpdated - a.lastUpdated);

    setState({ isLoading: false, groups });
  };

  useEffect(() => {
    refresh();
  }, []);

  async function handleExportGroup(group: VideoGroup, format: "markdown" | "json" | "csv") {
    if (!canExport && format !== "markdown") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Upgrade to Pro",
        message: "Advanced export formats are for Pro users.",
      });
      return;
    }
    try {
      await performExport(group.highlights, format);
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Export Failed", message: String(e) });
    }
  }

  async function handleExportAll(format: "markdown" | "json" | "csv") {
    if (!canExport && format !== "markdown") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Upgrade to Pro",
        message: "Advanced export formats are for Pro users.",
      });
      return;
    }
    try {
      const allHighlights = state.groups.flatMap((g) => g.highlights);
      await performExport(allHighlights, format);
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Export Failed", message: String(e) });
    }
  }

  const VIEW_LIMIT = 10;
  const visibleGroups = isPro ? state.groups : state.groups.slice(0, VIEW_LIMIT);
  const hiddenCount = Math.max(0, state.groups.length - visibleGroups.length);

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Search your videos...">
      {state.groups.length === 0 && !state.isLoading ? (
        <List.EmptyView title="No highlights yet" description="Run 'Create Highlight' to add some." icon={Icon.Video} />
      ) : (
        <>
          {visibleGroups.map((group) => (
            <List.Item
              key={group.id}
              title={group.title}
              subtitle={`${group.highlights.length} highlight${group.highlights.length === 1 ? "" : "s"}`}
              icon={{ source: Icon.Video, tintColor: Color.Red }}
              accessories={[{ date: new Date(group.lastUpdated), tooltip: "Last Updated" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Highlights"
                    target={<VideoDetail group={group} onRefresh={refresh} />}
                    icon={Icon.List}
                  />
                  <Action.Push
                    title="Show Stats"
                    icon={Icon.BarChart}
                    target={
                      <VideoStats
                        videoTitle={group.title}
                        videoUrl={group.url}
                        videoId={group.id}
                        highlights={group.highlights}
                      />
                    }
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                  {group.url && <Action.OpenInBrowser url={group.url} title="Open Video" />}

                  <ActionPanel.Section title="Export All">
                    <Action
                      title="Export to Markdown"
                      icon={Icon.Document}
                      onAction={() => handleExportGroup(group, "markdown")}
                    />
                    {canExport && (
                      <>
                        <Action
                          title="Export to JSON"
                          icon={Icon.Code}
                          onAction={() => handleExportGroup(group, "json")}
                        />
                        <Action
                          title="Export to CSV"
                          icon={Icon.List}
                          onAction={() => handleExportGroup(group, "csv")}
                        />
                      </>
                    )}
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}

          {/* Footer for Free Users */}
          {!isPro && hiddenCount > 0 && (
            <List.Item
              title={`Export to Markdown to view all ${state.groups.length} videos`}
              icon={Icon.Download}
              accessories={[{ text: `${hiddenCount} more hidden` }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Export All to Markdown"
                    icon={Icon.Download}
                    onAction={() => handleExportAll("markdown")}
                  />
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
