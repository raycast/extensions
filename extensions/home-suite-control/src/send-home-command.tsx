import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";

type Preferences = {
  homeSuiteBaseUrl: string;
  apiKey: string;
};

type CommandItem = {
  text: string;
};

const RECENT_STORAGE_KEY = "recent-commands";
const FAVORITES_STORAGE_KEY = "favorite-commands";

const MAX_VISIBLE_RECENTS = 10;
const MAX_STORED_HISTORY = 200;
const AUTO_CLOSE_DELAY_MS = 5000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCommand(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [searchText, setSearchText] = useState("");
  const [recent, setRecent] = useState<CommandItem[]>([]);
  const [favorites, setFavorites] = useState<CommandItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const closeTokenRef = useRef(0);

  function cancelPendingClose() {
    closeTokenRef.current += 1;
  }

  async function scheduleCloseIfStillIdle() {
    const tokenAtSchedule = closeTokenRef.current;
    await sleep(AUTO_CLOSE_DELAY_MS);

    if (closeTokenRef.current !== tokenAtSchedule) {
      return;
    }

    await closeMainWindow();
  }

  useEffect(() => {
    async function loadStoredCommands() {
      await Promise.all([loadRecentCommands(), loadFavoriteCommands()]);
      setIsLoading(false);
    }

    void loadStoredCommands();
  }, []);

  async function loadRecentCommands() {
    try {
      const stored = await LocalStorage.getItem<string>(RECENT_STORAGE_KEY);
      if (!stored) {
        setRecent([]);
        return;
      }

      const parsed = JSON.parse(stored) as CommandItem[];
      setRecent(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error("Failed to load recent commands", error);
      setRecent([]);
    }
  }

  async function loadFavoriteCommands() {
    try {
      const stored = await LocalStorage.getItem<string>(FAVORITES_STORAGE_KEY);
      if (!stored) {
        setFavorites([]);
        return;
      }

      const parsed = JSON.parse(stored) as CommandItem[];
      setFavorites(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error("Failed to load favorite commands", error);
      setFavorites([]);
    }
  }

  async function persistRecentCommands(items: CommandItem[]) {
    setRecent(items);
    await LocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items));
  }

  async function persistFavoriteCommands(items: CommandItem[]) {
    setFavorites(items);
    await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  }

  async function saveRecentCommand(text: string) {
    const trimmed = text.trim();
    const normalized = normalizeCommand(trimmed);

    if (!normalized) {
      return;
    }

    const updated = [{ text: trimmed }, ...recent.filter((item) => normalizeCommand(item.text) !== normalized)].slice(
      0,
      MAX_STORED_HISTORY,
    );

    await persistRecentCommands(updated);
  }

  function isFavoriteText(text: string) {
    const normalized = normalizeCommand(text);
    return favorites.some((item) => normalizeCommand(item.text) === normalized);
  }

  async function addToFavorites(text: string) {
    cancelPendingClose();

    const trimmed = text.trim();
    const normalized = normalizeCommand(trimmed);

    if (!normalized) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing to favorite",
        message: "Type or select a command first",
      });
      return;
    }

    if (favorites.some((item) => normalizeCommand(item.text) === normalized)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Already a favorite",
        message: trimmed,
      });
      return;
    }

    const updated = [...favorites, { text: trimmed }];
    await persistFavoriteCommands(updated);

    await showToast({
      style: Toast.Style.Success,
      title: "Added to favorites",
      message: trimmed,
    });
  }

  async function removeFromFavorites(text: string) {
    cancelPendingClose();

    const normalized = normalizeCommand(text);
    const updated = favorites.filter((item) => normalizeCommand(item.text) !== normalized);

    await persistFavoriteCommands(updated);

    await showToast({
      style: Toast.Style.Success,
      title: "Removed from favorites",
      message: text,
    });
  }

  async function moveFavoriteUp(text: string) {
    cancelPendingClose();

    const normalized = normalizeCommand(text);
    const index = favorites.findIndex((item) => normalizeCommand(item.text) === normalized);

    if (index <= 0) {
      return;
    }

    const updated = moveItem(favorites, index, index - 1);
    await persistFavoriteCommands(updated);

    await showToast({
      style: Toast.Style.Success,
      title: "Moved favorite up",
      message: text,
    });
  }

  async function moveFavoriteDown(text: string) {
    cancelPendingClose();

    const normalized = normalizeCommand(text);
    const index = favorites.findIndex((item) => normalizeCommand(item.text) === normalized);

    if (index === -1 || index >= favorites.length - 1) {
      return;
    }

    const updated = moveItem(favorites, index, index + 1);
    await persistFavoriteCommands(updated);

    await showToast({
      style: Toast.Style.Success,
      title: "Moved favorite down",
      message: text,
    });
  }

  async function removeFromHistory(text: string) {
    cancelPendingClose();

    const normalized = normalizeCommand(text);
    const updated = recent.filter((item) => normalizeCommand(item.text) !== normalized);

    await persistRecentCommands(updated);

    await showToast({
      style: Toast.Style.Success,
      title: "Removed from history",
      message: text,
    });
  }

  async function sendCommand(rawText: string) {
    cancelPendingClose();

    const text = rawText.trim();

    if (!text) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Command required",
        message: "Type a command first",
      });
      return;
    }

    setIsLoading(true);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending command...",
      message: text,
    });

    try {
      const baseUrl = preferences.homeSuiteBaseUrl.trim().replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": preferences.apiKey,
        },
        body: JSON.stringify({
          text,
          source_id: "raycast",
          source_type: "remote",
          origin: "raycast",
          response_mode: "text",
        }),
      });

      const rawBody = await response.text();

      let parsed: unknown = undefined;

      try {
        parsed = rawBody ? JSON.parse(rawBody) : undefined;
      } catch {
        // ignore non-JSON response bodies
      }

      if (!response.ok) {
        throw new Error(rawBody || `HTTP ${response.status}`);
      }

      let reply = "";

      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;

        if (typeof obj.response === "string") {
          reply = obj.response;
        } else if (typeof obj.message === "string") {
          reply = obj.message;
        } else if (typeof obj.result === "string") {
          reply = obj.result;
        } else if (typeof obj.text === "string") {
          reply = obj.text;
        }
      }

      if (!reply && rawBody.trim()) {
        reply = rawBody.trim();
      }

      if (!reply) {
        reply = "Command sent";
      }

      const commandUnderstood =
        parsed && typeof parsed === "object" && typeof (parsed as Record<string, unknown>).handled === "boolean"
          ? (parsed as Record<string, unknown>).handled === true
          : !reply.toLowerCase().includes("i didn't understand that");
      if (commandUnderstood) {
        await saveRecentCommand(text);
      }
      setSearchText("");

      toast.style = Toast.Style.Success;
      toast.title = "Command sent";
      toast.message = reply;

      void scheduleCloseIfStillIdle();
    } catch (error) {
      console.error("Failed to send command", error);

      cancelPendingClose();

      toast.style = Toast.Style.Failure;
      toast.title = "Command failed";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
    }
  }

  const normalizedSearch = normalizeCommand(searchText);

  const favoriteKeySet = useMemo(() => {
    return new Set(favorites.map((item) => normalizeCommand(item.text)));
  }, [favorites]);

  const filteredFavorites = useMemo(() => {
    if (!normalizedSearch) {
      return favorites;
    }

    return favorites.filter((item) => normalizeCommand(item.text).includes(normalizedSearch));
  }, [favorites, normalizedSearch]);

  const filteredRecent = useMemo(() => {
    const nonFavoriteHistory = recent.filter((item) => !favoriteKeySet.has(normalizeCommand(item.text)));

    if (!normalizedSearch) {
      return nonFavoriteHistory.slice(0, MAX_VISIBLE_RECENTS);
    }

    return nonFavoriteHistory.filter((item) => normalizeCommand(item.text).includes(normalizedSearch));
  }, [recent, favoriteKeySet, normalizedSearch]);

  function handleSearchTextChange(value: string) {
    cancelPendingClose();
    setSearchText(value);
  }

  const trimmedSearchText = searchText.trim();

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type a home command..."
      onSearchTextChange={handleSearchTextChange}
      searchText={searchText}
    >
      <List.EmptyView
        title="No Commands Yet"
        description="Type a Home Suite command above to get started"
        icon={Icon.House}
      />

      {trimmedSearchText ? (
        <List.Section title="Run Command">
          <List.Item
            title={`Run "${trimmedSearchText}"`}
            subtitle="Press Enter to send immediately"
            icon={Icon.Terminal}
            actions={
              <ActionPanel>
                <Action title="Send Command" icon={Icon.ArrowRight} onAction={() => void sendCommand(searchText)} />
                <Action
                  title="Add Current Search to Favorites"
                  icon={Icon.Star}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  onAction={() => void addToFavorites(searchText)}
                />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Gear}
                  onAction={() => {
                    cancelPendingClose();
                    void openExtensionPreferences();
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {filteredFavorites.length > 0 ? (
        <List.Section title="Favorites">
          {filteredFavorites.map((item) => (
            <List.Item
              key={`favorite-${normalizeCommand(item.text)}`}
              title={item.text}
              icon={Icon.Star}
              actions={
                <ActionPanel>
                  <Action title="Run Favorite" icon={Icon.ArrowRight} onAction={() => void sendCommand(item.text)} />
                  <Action
                    title="Put in Search Bar"
                    icon={Icon.Pencil}
                    onAction={() => {
                      cancelPendingClose();
                      setSearchText(item.text);
                    }}
                  />
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={() => void removeFromFavorites(item.text)}
                  />
                  <Action
                    title="Move Favorite up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
                    onAction={() => void moveFavoriteUp(item.text)}
                  />
                  <Action
                    title="Move Favorite Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
                    onAction={() => void moveFavoriteDown(item.text)}
                  />
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={() => {
                      cancelPendingClose();
                      void openExtensionPreferences();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      <List.Section title={normalizedSearch ? "History Matches" : "Recent"}>
        {filteredRecent.map((item) => (
          <List.Item
            key={`recent-${normalizeCommand(item.text)}`}
            title={item.text}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action
                  title="Run Recent Command"
                  icon={Icon.ArrowRight}
                  onAction={() => void sendCommand(item.text)}
                />
                <Action
                  title="Put in Search Bar"
                  icon={Icon.Pencil}
                  onAction={() => {
                    cancelPendingClose();
                    setSearchText(item.text);
                  }}
                />
                {!isFavoriteText(item.text) ? (
                  <Action
                    title="Add to Favorites"
                    icon={Icon.Star}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                    onAction={() => void addToFavorites(item.text)}
                  />
                ) : null}
                <Action
                  title="Remove from History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => void removeFromHistory(item.text)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
