import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CardsListCommand } from "./components/CardsListCommand";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { SetApiKeyAction } from "./components/SetApiKeyAction";
import { SignOutAction } from "./components/SignOutAction";
import {
  getUserFacingErrorMessage,
  listFolders,
  type RaycastFolder,
  searchCards,
} from "./lib/api";
import { folderTint } from "./lib/folderColors";
import { useTeakAuth } from "./lib/useTeakAuth";

function FolderCardsView({ folder }: { folder: RaycastFolder }) {
  // The list reloads when this function changes, so it must stay stable.
  const loadCards = useCallback(
    (input: Parameters<typeof searchCards>[0]) =>
      searchCards({ ...input, folder: folder.id, limit: 50 }, "interactive"),
    [folder.id],
  );
  return (
    <CardsListCommand
      emptyDescription={
        folder.kind === "smart"
          ? "No cards match this folder's search right now."
          : "Add cards to this folder from any card's actions."
      }
      emptyIcon={Icon.Folder}
      emptyTitle="No cards in this folder"
      latestSectionTitle={folder.name}
      loadCards={loadCards}
      navigationTitle={`Folder: ${folder.name}`}
      searchBarPlaceholder={`Search "${folder.name}" or use type:, tag:, sort:oldest`}
    />
  );
}

const cardCountLabel = (folder: RaycastFolder): string =>
  folder.kind === "smart"
    ? (folder.query ?? "Smart folder")
    : `${folder.cardCount ?? 0} card${folder.cardCount === 1 ? "" : "s"}`;

export default function FoldersCommand() {
  const {
    isAuthenticated,
    error: authError,
    isLoading: isCheckingAuth,
    refresh: refreshAuth,
  } = useTeakAuth();

  const [folders, setFolders] = useState<RaycastFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const { push } = useNavigation();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setFolders((await listFolders("interactive")).items);
    } catch (requestError) {
      setError(getUserFacingErrorMessage(requestError));
      setFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isCheckingAuth) {
      return;
    }
    if (!isAuthenticated) {
      setFolders([]);
      setIsLoading(false);
      return;
    }
    void load();
  }, [isCheckingAuth, isAuthenticated, load]);

  const visible = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    return needle
      ? folders.filter((folder) => folder.name.toLowerCase().includes(needle))
      : folders;
  }, [folders, searchText]);
  const manual = visible.filter((folder) => folder.kind === "manual");
  const smart = visible.filter((folder) => folder.kind === "smart");

  if (isCheckingAuth) {
    return <List isLoading navigationTitle="Teak Folders" />;
  }

  if (!isAuthenticated) {
    return <MissingApiKeyDetail error={authError} onSignedIn={refreshAuth} />;
  }

  const renderFolder = (folder: RaycastFolder) => (
    <List.Item
      accessories={
        folder.kind === "smart"
          ? [{ icon: Icon.MagnifyingGlass, tooltip: "Smart folder" }]
          : []
      }
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Eye}
            onAction={() => push(<FolderCardsView folder={folder} />)}
            title="Open Folder"
          />
          <Action
            icon={Icon.ArrowClockwise}
            onAction={() => void load()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            title="Reload Folders"
          />
          <Action.CopyToClipboard
            content={folder.name}
            shortcut={{ key: "c", modifiers: ["cmd"] }}
            title="Copy Folder Name"
          />
          <SetApiKeyAction />
          <SignOutAction onSignedOut={refreshAuth} />
        </ActionPanel>
      }
      icon={{
        source: folder.kind === "smart" ? Icon.Stars : Icon.Folder,
        tintColor: folderTint(folder.color),
      }}
      key={folder.id}
      subtitle={cardCountLabel(folder)}
      title={folder.name}
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Teak Folders"
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter folders..."
      searchText={searchText}
    >
      {error ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowClockwise}
                onAction={() => void load()}
                title="Retry"
              />
            </ActionPanel>
          }
          description="Check your API key and network connection, then retry."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}
      {!(error || isLoading) && visible.length === 0 ? (
        <List.EmptyView
          description={
            searchText.trim()
              ? "Try a different keyword to find folders."
              : "Create a folder in Teak, or save a search as a smart folder from Search Cards."
          }
          icon={Icon.Folder}
          title={searchText.trim() ? "No matching folders" : "No folders yet"}
        />
      ) : null}
      {manual.length > 0 ? (
        <List.Section title="Folders">{manual.map(renderFolder)}</List.Section>
      ) : null}
      {smart.length > 0 ? (
        <List.Section title="Smart Folders">
          {smart.map(renderFolder)}
        </List.Section>
      ) : null}
    </List>
  );
}
