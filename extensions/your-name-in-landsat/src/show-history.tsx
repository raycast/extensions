import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  launchCommand,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { clearAllHistory, HistoryEntry, readHistory, removeHistory } from "./lib/history";
import { SITE_URL, TILE_BASE_URL, TILE_META } from "./lib/tiles";
import { normalizeName } from "./lib/compose";
import { LandsatDetail } from "./lib/detail";
import { TileActions } from "./lib/actions";
import { encodeFileUri, preferredTileUrl, tileLetter } from "./lib/url";
import { NameForm } from "./lib/name-form";

export default function Command() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  const refresh = useCallback(async () => {
    setEntries(await readHistory());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <List isLoading={entries === null} isShowingDetail searchBarPlaceholder="Search history…">
      {entries && entries.length === 0 ? (
        <List.EmptyView
          icon={Icon.Image}
          title="No generations yet"
          description="Run the Generate Name command to create one"
          actions={
            <ActionPanel>
              <Action.Push
                title="Generate Name"
                icon={Icon.Stars}
                target={
                  <NameForm
                    onSubmit={async ({ name, spacing }) => {
                      try {
                        await launchCommand({
                          name: "generate-name",
                          type: LaunchType.UserInitiated,
                          arguments: { name, spacing: String(spacing) },
                        });
                      } catch (e) {
                        await showFailureToast(e, { title: "Could not open Generate Name" });
                      }
                    }}
                  />
                }
              />
              <Action.OpenInBrowser title="Open Original Website" url={SITE_URL} />
            </ActionPanel>
          }
        />
      ) : (
        entries?.map((entry) => <HistoryItem key={entry.id} entry={entry} onChange={refresh} />)
      )}
    </List>
  );
}

function HistoryItem({ entry, onChange }: { entry: HistoryEntry; onChange: () => Promise<void> }) {
  const display = (normalizeName(entry.name).toUpperCase().trim() || "Untitled").slice(0, 60);
  const markdown = `![${display}](${encodeFileUri(entry.filePath)})`;
  const firstTile = entry.tileIds[0];
  const iconSource = firstTile ? `${TILE_BASE_URL}/${firstTile}.jpg` : Icon.Image;
  return (
    <List.Item
      title={display}
      subtitle={new Date(entry.createdAt).toLocaleString()}
      icon={{ source: iconSource }}
      detail={<List.Item.Detail markdown={markdown} metadata={<ItemMetadata entry={entry} />} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="View" icon={Icon.Eye} target={<ViewDetail entry={entry} />} />
            <TileActions exportFilePath={entry.exportFilePath} tileIds={entry.tileIds} downloadBaseName={display} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Clear"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={async () => {
                await removeHistory(entry.id);
                await onChange();
                await showToast({ style: Toast.Style.Success, title: "Removed from history" });
              }}
            />
            <Action
              title="Clear All"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
              onAction={async () => {
                const ok = await confirmAlert({
                  title: "Clear All History?",
                  message: "This will delete every saved generation.",
                  primaryAction: { title: "Clear All", style: Alert.ActionStyle.Destructive },
                });
                if (!ok) return;
                await clearAllHistory();
                await onChange();
                await showToast({ style: Toast.Style.Success, title: "History cleared" });
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open Original Website"
              url={SITE_URL}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ItemMetadata({ entry }: { entry: HistoryEntry }) {
  return (
    <List.Item.Detail.Metadata>
      {entry.tileIds.map((id, i) => {
        const meta = TILE_META[id];
        const letter = tileLetter(id);
        const name = meta?.title ?? id;
        const url = preferredTileUrl(meta);
        if (url) return <List.Item.Detail.Metadata.Link key={`${id}-${i}`} title={letter} target={url} text={name} />;
        return <List.Item.Detail.Metadata.Label key={`${id}-${i}`} title={letter} text={name} />;
      })}
    </List.Item.Detail.Metadata>
  );
}

function ViewDetail({ entry }: { entry: HistoryEntry }) {
  const { pop } = useNavigation();
  const display = normalizeName(entry.name).toUpperCase().trim() || "Untitled";
  return (
    <LandsatDetail
      displayName={display}
      filePath={entry.filePath}
      tileIds={entry.tileIds}
      actions={
        <ActionPanel>
          <TileActions exportFilePath={entry.exportFilePath} tileIds={entry.tileIds} downloadBaseName={display} />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={pop} />
          <Action.OpenInBrowser
            title="Open Original Website"
            url={SITE_URL}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}
