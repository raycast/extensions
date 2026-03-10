import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { search, type Sound } from "@repo/domain";
import { exec, type ChildProcess } from "node:child_process";
import { useState, useEffect, useCallback } from "react";

let currentPlayer: ChildProcess | null = null;
let currentFilename: string | null = null;

import { soundFilePath } from "./lib/cache.js";
import {
  type Favourites,
  readFavourites,
  toggleFavourite,
  sortWithFavourites,
} from "./lib/favourites.js";
import { loadCatalog, type SyncState } from "./lib/sync.js";

interface Preferences {
  serverUrl: string;
}

const statusText = (state: SyncState): string => {
  switch (state.phase) {
    case "loading-cache":
      return "Loading cache…";
    case "cached":
      return "Checking for updates…";
    case "checking":
      return "Checking server…";
    case "downloading":
      return `Downloading ${state.downloaded}/${state.total}…`;
    case "done":
      return "";
    case "error":
      return `Error: ${state.message}`;
  }
};

export default function Command() {
  const { serverUrl } = getPreferenceValues<Preferences>();
  const [sounds, setSounds] = useState<readonly Sound[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({
    phase: "loading-cache",
  });
  const [searchText, setSearchText] = useState("");
  const [favourites, setFavourites] = useState<Favourites>({} as Favourites);

  const isLoading = syncState.phase !== "done" && syncState.phase !== "error";

  const onProgress = useCallback((state: SyncState) => {
    setSyncState(state);
    if (state.phase === "cached" || state.phase === "done") {
      setSounds(state.catalog.sounds);
    }
  }, []);

  useEffect(() => {
    readFavourites().then(setFavourites);
    loadCatalog(serverUrl, onProgress).catch((err) => {
      setSyncState({ phase: "error", message: String(err) });
      showToast({
        style: Toast.Style.Failure,
        title: "Sync failed",
        message: String(err),
      });
    });
  }, [serverUrl, onProgress]);

  const filtered = sortWithFavourites(search([...sounds], searchText), favourites);
  const subtitle = statusText(syncState);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search sounds…"
      navigationTitle="BoopBox"
    >
      {subtitle && (
        <List.EmptyView
          title={subtitle}
          icon={isLoading ? Icon.CircleProgress : Icon.XMarkCircle}
        />
      )}
      {filtered.map((sound) => (
        <List.Item
          key={sound.filename}
          title={sound.name}
          subtitle={sound.tags.join(", ")}
          keywords={[...sound.tags]}
          {...(sound.filename in favourites
            ? { icon: { source: Icon.StarCircle, tintColor: Color.Yellow } }
            : {})}
          actions={
            <ActionPanel>
              <Action
                title="Play Sound"
                icon={Icon.Play}
                onAction={() => {
                  if (currentFilename === sound.filename && currentPlayer) {
                    currentPlayer.kill();
                    currentPlayer = null;
                    currentFilename = null;
                    return;
                  }
                  currentPlayer?.kill();
                  const fp = soundFilePath(sound.filename);
                  const proc = exec(`afplay "${fp}"`, (err) => {
                    if (proc === currentPlayer) {
                      currentPlayer = null;
                      currentFilename = null;
                    }
                    if (err && !proc.killed)
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Playback failed",
                      });
                  });
                  currentPlayer = proc;
                  currentFilename = sound.filename;
                }}
              />
              <Action
                title="Toggle Favourite"
                icon={Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => {
                  toggleFavourite(sound.filename).then(setFavourites);
                }}
              />
              <Action.CopyToClipboard title="Copy Name" content={sound.name} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
