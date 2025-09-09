import {
  ActionPanel,
  Action,
  List,
  LocalStorage,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  Form,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { FAVORITE_ICON_NAMES, getIcon } from "./favorite-icons";
import { getTerminalAdapter } from "./terminal-adapters";
import { useState, useEffect, useMemo } from "react";
import { randomUUID } from "crypto";
import { homedir } from "os";
import path from "path";
import { access, constants } from "fs/promises";

const STORAGE_KEY = "claude-code-favorites";
const CURRENT_VERSION = 1;

interface Preferences {
  terminalApp: "Terminal" | "Alacritty";
  defaultFavoriteIcon: string;
}

interface Favorite {
  id: string;
  path: string;
  name?: string;
  icon?: string;
  addedAt: Date;
  lastOpened?: Date;
  openCount: number;
}

interface FavoritesState {
  favorites: Favorite[];
  version: number;
}

function showSuccessToast(title: string, message?: string) {
  showToast({
    style: Toast.Style.Success,
    title,
    message,
  });
}

function getRelativeTime(date: Date | undefined): string {
  if (!date) return "Never";

  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }
  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800);
    if (weeks === 1) return "Last week";
    return `${weeks} weeks ago`;
  }
  const months = Math.floor(seconds / 2592000);
  if (months === 1) return "Last month";
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

function expandTilde(filepath: string): string {
  if (filepath.startsWith("~/")) {
    return path.join(homedir(), filepath.slice(2));
  }
  return filepath;
}

function getDirectoryName(dirPath: string): string {
  return path.basename(dirPath) || path.dirname(dirPath);
}

async function openInTerminal(favorite: Favorite, preferences: Preferences, onSuccess: () => void): Promise<void> {
  const expandedPath = expandTilde(favorite.path);

  try {
    try {
      await access(expandedPath, constants.R_OK);
    } catch {
      throw new Error(`Cannot access directory: ${expandedPath}. It may have been moved or deleted.`);
    }

    const adapter = getTerminalAdapter(preferences.terminalApp);

    if (!adapter) {
      throw new Error(`Unsupported terminal: ${preferences.terminalApp}`);
    }

    await adapter.open(expandedPath);
    onSuccess();
    showSuccessToast("Opened in Terminal", favorite.name || getDirectoryName(favorite.path));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await showFailureToast(errorMessage, {
      title: "Failed to open terminal",
    });
  }
}

function IconDropdown({
  value,
  onChange,
  defaultValue,
}: {
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
}) {
  return (
    <Form.Dropdown id="icon" title="Icon" value={value} onChange={onChange} defaultValue={defaultValue}>
      {FAVORITE_ICON_NAMES.map((iconName) => (
        <Form.Dropdown.Item key={iconName} value={iconName} title={iconName} icon={getIcon(iconName)} />
      ))}
    </Form.Dropdown>
  );
}

function AddFavoriteForm({
  onAdd,
  existingPaths,
  defaultIcon,
}: {
  onAdd: (favorite: Favorite) => void;
  existingPaths: string[];
  defaultIcon: string;
}) {
  const { pop } = useNavigation();
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [pathError, setPathError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [, setIsValidating] = useState(false);

  const validatePath = async (pathValue: string): Promise<string | undefined> => {
    if (!pathValue.trim()) {
      return "Path is required";
    }

    const expandedPath = expandTilde(pathValue);

    if (existingPaths.includes(expandedPath)) {
      return "This directory is already in your favorites";
    }

    try {
      await access(expandedPath, constants.R_OK);
      const stats = await import("fs/promises").then((fs) => fs.stat(expandedPath));
      if (!stats.isDirectory()) {
        return "Path must be a directory";
      }
    } catch {
      return "Directory does not exist or is not accessible";
    }

    return undefined;
  };

  const validateName = (nameValue: string): string | undefined => {
    if (nameValue.length > 100) {
      return "Name must be 100 characters or less";
    }
    return undefined;
  };

  const handleSubmit = async (values: { path: string; name: string; icon: string }) => {
    setIsValidating(true);

    const pathValidationError = await validatePath(values.path);
    const nameValidationError = validateName(values.name);

    if (pathValidationError || nameValidationError) {
      setPathError(pathValidationError);
      setNameError(nameValidationError);
      setIsValidating(false);
      return;
    }

    const expandedPath = expandTilde(values.path);
    const newFavorite: Favorite = {
      id: randomUUID(),
      path: expandedPath,
      name: values.name || undefined,
      icon: values.icon || defaultIcon,
      addedAt: new Date(),
      openCount: 0,
    };

    onAdd(newFavorite);
    pop();
    showSuccessToast("Added Favorite", newFavorite.name || getDirectoryName(newFavorite.path));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Favorite" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="path"
        title="Directory Path"
        placeholder="~/Documents/Projects"
        value={path}
        error={pathError}
        onChange={(value) => {
          setPath(value);
          setPathError(undefined);
        }}
        onBlur={async (event) => {
          const error = await validatePath(event.target.value || "");
          setPathError(error);
        }}
      />
      <Form.TextField
        id="name"
        title="Name (Optional)"
        placeholder="My Project"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
        onBlur={(event) => {
          const error = validateName(event.target.value || "");
          setNameError(error);
        }}
      />
      <IconDropdown defaultValue={defaultIcon} />
    </Form>
  );
}

function EditFavoriteForm({
  favorite,
  onEdit,
  defaultIcon,
}: {
  favorite: Favorite;
  onEdit: (favorite: Favorite) => void;
  defaultIcon: string;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(favorite.name || "");
  const [icon, setIcon] = useState(favorite.icon || defaultIcon);
  const [nameError, setNameError] = useState<string | undefined>();

  const validateName = (nameValue: string): string | undefined => {
    if (nameValue.length > 100) {
      return "Name must be 100 characters or less";
    }
    return undefined;
  };

  const handleSubmit = (values: { name: string; icon: string }) => {
    const nameValidationError = validateName(values.name);

    if (nameValidationError) {
      setNameError(nameValidationError);
      return;
    }

    const updatedFavorite = {
      ...favorite,
      name: values.name || undefined,
      icon: values.icon || defaultIcon,
    };

    onEdit(updatedFavorite);
    pop();
    showSuccessToast("Updated Favorite", updatedFavorite.name || getDirectoryName(updatedFavorite.path));
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Favorite" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Path: ${favorite.path}`} />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Project"
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          setNameError(undefined);
        }}
        onBlur={(event) => {
          const error = validateName(event.target.value || "");
          setNameError(error);
        }}
      />
      <IconDropdown value={icon} onChange={setIcon} />
    </Form>
  );
}

async function checkDependencies(preferences: Preferences): Promise<void> {
  const adapter = getTerminalAdapter(preferences.terminalApp);
  if (!adapter) {
    await showFailureToast(`Unsupported terminal: ${preferences.terminalApp}`, {
      title: "Terminal Not Supported",
      message: "Please select a supported terminal in preferences.",
    });
    throw new Error(`Unsupported terminal: ${preferences.terminalApp}`);
  }
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setDependenciesValid] = useState(true);

  useEffect(() => {
    checkDependencies(preferences)
      .then(() => setDependenciesValid(true))
      .catch(() => setDependenciesValid(false))
      .finally(() => loadFavorites());
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (stored) {
        let state: FavoritesState;
        try {
          state = JSON.parse(stored);
        } catch (parseError) {
          console.error("Failed to parse favorites data:", parseError);
          await showFailureToast("Favorites data is corrupted. Resetting to empty list.", {
            title: "Corrupted Data",
            message: "Your favorites data was corrupted and has been reset.",
          });
          await LocalStorage.removeItem(STORAGE_KEY);
          setFavorites([]);
          return;
        }

        if (!state.favorites || !Array.isArray(state.favorites)) {
          console.error("Invalid favorites structure");
          await showFailureToast("Invalid favorites data structure. Resetting to empty list.", {
            title: "Invalid Data",
            message: "Your favorites data structure was invalid and has been reset.",
          });
          await LocalStorage.removeItem(STORAGE_KEY);
          setFavorites([]);
          return;
        }

        const favorites = state.favorites
          .filter((fav) => fav && fav.id && fav.path)
          .map((fav) => ({
            ...fav,
            addedAt: new Date(fav.addedAt),
            lastOpened: fav.lastOpened ? new Date(fav.lastOpened) : undefined,
            openCount: fav.openCount || 0,
            icon: fav.icon || "Folder",
          }));
        setFavorites(favorites);
      }
    } catch (error) {
      console.error("Failed to load favorites:", error);
      await showFailureToast(error, {
        title: "Failed to load favorites",
        message: "An unexpected error occurred while loading favorites.",
      });
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFavorites = async (newFavorites: Favorite[]) => {
    try {
      const state: FavoritesState = {
        favorites: newFavorites,
        version: CURRENT_VERSION,
      };
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setFavorites(newFavorites);
    } catch (error) {
      console.error("Failed to save favorites:", error);
      await showFailureToast(error, {
        title: "Failed to save favorites",
      });
    }
  };

  const addFavorite = async (favorite: Favorite) => {
    const newFavorites = [...favorites, favorite];
    await saveFavorites(newFavorites);
  };

  const updateFavorite = async (updatedFavorite: Favorite) => {
    const newFavorites = favorites.map((fav) => (fav.id === updatedFavorite.id ? updatedFavorite : fav));
    await saveFavorites(newFavorites);
  };

  const removeFavorite = async (favoriteId: string) => {
    const newFavorites = favorites.filter((fav) => fav.id !== favoriteId);
    await saveFavorites(newFavorites);
  };

  const markAsOpened = async (favoriteId: string) => {
    const newFavorites = favorites.map((fav) =>
      fav.id === favoriteId
        ? {
            ...fav,
            lastOpened: new Date(),
            openCount: fav.openCount + 1,
          }
        : fav,
    );
    await saveFavorites(newFavorites);
  };

  const filteredAndSortedFavorites = useMemo(() => {
    const searchLower = searchText.toLowerCase();

    const matchesSearch = (favorite: Favorite) => {
      if (!searchText) return true;

      const searchableText = [
        favorite.name?.toLowerCase(),
        favorite.path.toLowerCase(),
        getDirectoryName(favorite.path).toLowerCase(),
      ]
        .filter(Boolean)
        .join(" ");

      return searchableText.includes(searchLower);
    };

    const compareByRecency = (a: Favorite, b: Favorite) => {
      if (a.lastOpened && b.lastOpened) {
        return b.lastOpened.getTime() - a.lastOpened.getTime();
      }
      if (a.lastOpened) return -1;
      if (b.lastOpened) return 1;
      return 0;
    };

    const compareByUsage = (a: Favorite, b: Favorite) => b.openCount - a.openCount;

    const compareByName = (a: Favorite, b: Favorite) => {
      const nameA = a.name || getDirectoryName(a.path);
      const nameB = b.name || getDirectoryName(b.path);
      return nameA.localeCompare(nameB);
    };

    return favorites
      .filter(matchesSearch)
      .sort((a, b) => compareByRecency(a, b) || compareByUsage(a, b) || compareByName(a, b));
  }, [favorites, searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search favorites..."
      searchText={searchText}
    >
      {filteredAndSortedFavorites.length === 0 && !searchText ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No Favorites Yet"
          description="Press ⌘N to add your first favorite directory"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Favorite"
                icon={Icon.Plus}
                target={
                  <AddFavoriteForm
                    onAdd={addFavorite}
                    existingPaths={favorites.map((f) => f.path)}
                    defaultIcon={preferences.defaultFavoriteIcon}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ) : filteredAndSortedFavorites.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Favorites Found"
          description={`No favorites matching "${searchText}"`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Favorite"
                icon={Icon.Plus}
                target={
                  <AddFavoriteForm
                    onAdd={addFavorite}
                    existingPaths={favorites.map((f) => f.path)}
                    defaultIcon={preferences.defaultFavoriteIcon}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Favorites" subtitle={`${filteredAndSortedFavorites.length} items`}>
          {filteredAndSortedFavorites.map((favorite) => (
            <List.Item
              key={favorite.id}
              icon={getIcon(favorite.icon || preferences.defaultFavoriteIcon, preferences.defaultFavoriteIcon)}
              title={favorite.name || getDirectoryName(favorite.path)}
              subtitle={favorite.name ? favorite.path : undefined}
              accessories={[
                {
                  text: getRelativeTime(favorite.lastOpened),
                  tooltip: favorite.lastOpened
                    ? `Last opened: ${favorite.lastOpened.toLocaleString()}`
                    : "Never opened",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Open in ${preferences.terminalApp}`}
                    icon={Icon.Terminal}
                    onAction={() => openInTerminal(favorite, preferences, () => markAsOpened(favorite.id))}
                  />
                  <Action.Push
                    title="Edit Favorite"
                    icon={Icon.Pencil}
                    target={
                      <EditFavoriteForm
                        favorite={favorite}
                        onEdit={updateFavorite}
                        defaultIcon={preferences.defaultFavoriteIcon}
                      />
                    }
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />
                  <Action
                    title="Remove Favorite"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const options: Alert.Options = {
                        title: "Remove Favorite",
                        message: `Are you sure you want to remove "${
                          favorite.name || getDirectoryName(favorite.path)
                        }"?`,
                        primaryAction: {
                          title: "Remove",
                          style: Alert.ActionStyle.Destructive,
                          onAction: () => {
                            removeFavorite(favorite.id);
                            showSuccessToast("Removed Favorite");
                          },
                        },
                      };
                      await confirmAlert(options);
                    }}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                  <ActionPanel.Section>
                    <Action.Push
                      title="Add Favorite"
                      icon={Icon.Plus}
                      target={
                        <AddFavoriteForm
                          onAdd={addFavorite}
                          existingPaths={favorites.map((f) => f.path)}
                          defaultIcon={preferences.defaultFavoriteIcon}
                        />
                      }
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={favorite.path}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action.ShowInFinder
                      title="Show in Finder"
                      path={expandTilde(favorite.path)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
