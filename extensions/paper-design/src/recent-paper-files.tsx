import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import {
  getPaperFileUrl,
  isOpenInPaper,
  listPaperFiles,
  PaperMcpUnavailableError,
  type PaperFile,
} from "./paper-mcp";

const paperIcon = "extension-icon.png";
const paperFileIcon = Icon.AppWindowGrid2x2;

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    listPaperFiles,
    [],
    {
      keepPreviousData: true,
      onError: () => undefined,
    },
  );
  const files = data ?? [];
  const openFiles = files.filter(isOpenInPaper);
  const recentFiles = files.filter((file) => !isOpenInPaper(file));

  return (
    <List
      searchBarPlaceholder="Search files..."
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
    >
      {!isLoading && error ? (
        <PaperErrorState error={error} onRefresh={revalidate} />
      ) : !isLoading && files.length === 0 ? (
        <List.EmptyView
          icon={paperIcon}
          title="No recent files"
          description="Paper Desktop did not return any open or recent files."
          actions={<RefreshActionPanel onRefresh={revalidate} />}
        />
      ) : (
        <>
          {openFiles.length > 0 ? (
            <List.Section title="Open">
              {openFiles.map((file) => (
                <PaperFileItem
                  key={file.id}
                  file={file}
                  onRefresh={revalidate}
                />
              ))}
            </List.Section>
          ) : null}
          {recentFiles.length > 0 ? (
            <List.Section title="Recent">
              {recentFiles.map((file) => (
                <PaperFileItem
                  key={file.id}
                  file={file}
                  onRefresh={revalidate}
                />
              ))}
            </List.Section>
          ) : null}
        </>
      )}
    </List>
  );
}

function PaperErrorState({
  error,
  onRefresh,
}: {
  error: Error;
  onRefresh: () => void;
}) {
  const isUnavailable = error instanceof PaperMcpUnavailableError;

  return (
    <List.EmptyView
      icon={isUnavailable ? paperIcon : Icon.Warning}
      title={
        isUnavailable
          ? "Open Paper Desktop"
          : "Paper returned an unexpected response"
      }
      description={
        isUnavailable
          ? "Open Paper Desktop and refresh to see recent files."
          : "Make sure Paper Desktop is running with a Paper file loaded, then refresh."
      }
      actions={<RefreshActionPanel onRefresh={onRefresh} />}
    />
  );
}

function PaperFileItem({
  file,
  onRefresh,
}: {
  file: PaperFile;
  onRefresh: () => void;
}) {
  const paperLink = getPaperFileUrl(file.id);
  const accessories: List.Item.Accessory[] = [];

  if (file.updatedAt !== undefined) {
    accessories.push({
      date: { value: new Date(file.updatedAt), color: Color.SecondaryText },
      icon: Icon.Clock,
      tooltip: "Last updated",
    });
  }

  if (file.active) {
    accessories.push({
      tag: { value: "Current", color: Color.Green },
      icon: Icon.CheckCircle,
      tooltip: "Current Paper file",
    });
  } else if (file.open) {
    accessories.push({
      tag: { value: "Open", color: Color.Blue },
      icon: Icon.CircleProgress100,
      tooltip: "Open",
    });
  }

  return (
    <List.Item
      id={file.id}
      icon={paperFileIcon}
      title={file.name}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Open
            title="Open in Paper"
            target={paperLink}
            icon={Icon.AppWindow}
          />
          <Action.CopyToClipboard title="Copy Paper Link" content={paperLink} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function RefreshActionPanel({ onRefresh }: { onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
    </ActionPanel>
  );
}
