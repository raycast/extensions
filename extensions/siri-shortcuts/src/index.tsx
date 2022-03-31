import { ActionPanel, Action, List, Icon, showToast, Toast, closeMainWindow } from "@raycast/api";
import { useAsync } from "react-use";
import { exec as _exec } from "child_process";
import { promisify } from "util";
import { usePersistentState } from "raycast-toolkit";
import { useCallback } from "react";

const exec = promisify(_exec);

async function runShortcut(shortcut: string) {
  const toast = await showToast({ title: `Running ${shortcut}` });
  try {
    await exec(`shortcuts run "${shortcut}"`);
    closeMainWindow();
  } catch (err: unknown) {
    toast.title = `An error occurred running ${shortcut}`;
    toast.message = String(err).split(shortcut).slice(1).join(shortcut);
    toast.style = Toast.Style.Failure;
  }
}

async function viewShortcut(shortcut: string) {
  await exec(`shortcuts view "${shortcut}"`);
}

export default function Command() {
  const [favorites, setFavorites] = usePersistentState<string[]>("favorites", []);
  const addToFavorites = useCallback(
    (shortcut: string) => {
      setFavorites((favorites) => [...favorites, shortcut]);
    },
    [favorites, setFavorites]
  );
  const removeFromFavorites = useCallback(
    (shortcut: string) => {
      setFavorites((favorites) => favorites.filter((f) => f !== shortcut));
    },
    [favorites, setFavorites]
  );

  const { value, loading } = useAsync(async () => {
    const { stdout } = await exec("shortcuts list");
    return stdout.split("\n").filter(Boolean);
  });

  const items = value?.map((shortcut) => {
    return {
      id: shortcut,
      title: shortcut,
    };
  });

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter by title...">
      {items
        ?.sort((a) => (favorites.includes(a.id) ? -1 : 0))
        .map((item) => (
          <List.Item
            key={item.id}
            icon={favorites.includes(item.id) ? Icon.Star : Icon.Dot}
            title={item.title}
            actions={
              <ActionPanel>
                <Action title="Run Shortcut" icon={Icon.Terminal} onAction={() => runShortcut(item.id)} />
                {favorites.includes(item.id) ? (
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.XmarkCircle}
                    onAction={() => removeFromFavorites(item.id)}
                  />
                ) : (
                  <Action title="Add to Favorites" icon={Icon.Star} onAction={() => addToFavorites(item.id)} />
                )}
                <Action title="View in Shortcuts" icon={Icon.Eye} onAction={() => viewShortcut(item.id)} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
