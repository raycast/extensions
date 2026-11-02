import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountActions } from "./components/AccountActions";
import { CardsListCommand } from "./components/CardsListCommand";
import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
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
      loadCards={loadCards}
      navigationTitle={`Folder: ${folder.name}`}
      searchBarPlaceholder={`Search "${folder.name}", or filter with tag:, sort:oldest`}
      sectionTitle={
        folder.kind === "smart" ? "Matching Cards" : "In This Folder"
      }
    />
  );
}

const cardCountLabel = (folder: RaycastFolder): string =>
  `${folder.cardCount ?? 0} card${folder.cardCount === 1 ? "" : "s"}`;

const folderCountLabel = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

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

  const searchBar = {
    onSearchTextChange: setSearchText,
    searchBarPlaceholder: "Filter folders…",
    searchText,
  };

  if (isCheckingAuth) {
    return <List isLoading {...searchBar} />;
  }

  const listActions = (
    <>
      <ActionPanel.Section>
        <Action
          icon={Icon.ArrowClockwise}
          onAction={() => void load()}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          title="Reload Folders"
        />
      </ActionPanel.Section>
      <AccountActions onSignedOut={refreshAuth} />
    </>
  );

  if (!isAuthenticated) {
    return <MissingApiKeyDetail error={authError} onSignedIn={refreshAuth} />;
  }

  const renderFolder = (folder: RaycastFolder) => (
    <List.Item
      accessories={
        folder.kind === "smart"
          ? [
              {
                icon: Icon.MagnifyingGlass,
                tooltip: "Smart folder: lists what its search finds",
              },
            ]
          : [{ text: cardCountLabel(folder), tooltip: "Cards in this folder" }]
      }
      actions={
        <ActionPanel title={folder.name}>
          <Action
            icon={Icon.ArrowRight}
            onAction={() => push(<FolderCardsView folder={folder} />)}
            title="Open Folder"
          />
          <Action.CopyToClipboard
            content={folder.name}
            shortcut={Keyboard.Shortcut.Common.Copy}
            title="Copy Folder Name"
          />
          {listActions}
        </ActionPanel>
      }
      icon={{
        source: folder.kind === "smart" ? Icon.Stars : Icon.Folder,
        tintColor: folderTint(folder.color),
      }}
      key={folder.id}
      subtitle={
        folder.kind === "smart" ? (folder.query ?? undefined) : undefined
      }
      title={folder.name}
    />
  );

  return (
    <List isLoading={isLoading} {...searchBar}>
      {error ? (
        <List.EmptyView
          actions={<ActionPanel>{listActions}</ActionPanel>}
          description="Check your connection, then reload."
          icon={Icon.ExclamationMark}
          title={error}
        />
      ) : null}
      {!(error || isLoading) && visible.length === 0 ? (
        <List.EmptyView
          actions={<ActionPanel>{listActions}</ActionPanel>}
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
        <List.Section
          subtitle={folderCountLabel(manual.length, "folder")}
          title="Folders"
        >
          {manual.map(renderFolder)}
        </List.Section>
      ) : null}
      {smart.length > 0 ? (
        <List.Section
          subtitle={folderCountLabel(smart.length, "smart folder")}
          title="Smart Folders"
        >
          {smart.map(renderFolder)}
        </List.Section>
      ) : null}
    </List>
  );
}
