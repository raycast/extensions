import { Color, MenuBarExtra, openCommandPreferences, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { useMemo } from "react";
import { promisify } from "util";
import { useBookmarks } from "./hooks/use-bookmarks";
import GitfoxPreferences from "./interfaces/gitfox-preferences";

const execp = promisify(exec);

export default function MenuBarCommand() {
  const { data: groups = [], isLoading } = useBookmarks();

  const dedupedGroups = useMemo(() => {
    const seenPaths = new Set<string>();
    return groups.map((group) => ({
      ...group,
      bookmarks: group.bookmarks.filter((b) => {
        if (seenPaths.has(b.folder)) return false;
        seenPaths.add(b.folder);
        return true;
      }),
    }));
  }, [groups]);

  const openInGitfox = async (folder: string) => {
    try {
      const prefs = getPreferenceValues<GitfoxPreferences>();
      await execp(`${prefs.gitfoxCliPath} ${folder}`);
    } catch {
      // Silently fail in menu bar context
    }
  };

  return (
    <MenuBarExtra
      icon={{ source: "gitfox.svg", tintColor: Color.PrimaryText }}
      tooltip="Gitfox Repositories"
      isLoading={isLoading}
    >
      {dedupedGroups.map((group) =>
        group.bookmarks.length > 0 ? (
          <MenuBarExtra.Section key={group.id} title={group.name || undefined}>
            {group.bookmarks.map((bookmark) => (
              <MenuBarExtra.Item
                key={bookmark.id}
                title={bookmark.name}
                subtitle={bookmark.getBranch.name}
                onAction={() => openInGitfox(bookmark.getFolder)}
              />
            ))}
          </MenuBarExtra.Section>
        ) : null,
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Configure Command" onAction={() => openCommandPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
