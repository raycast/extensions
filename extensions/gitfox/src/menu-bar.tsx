import { Color, MenuBarExtra, openCommandPreferences, getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { useBookmarks } from "./hooks/use-bookmarks";
import GitfoxPreferences from "./interfaces/gitfox-preferences";

const execp = promisify(exec);

export default function MenuBarCommand() {
  const { data: groups = [], isLoading } = useBookmarks();

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
      {groups.map((group) => (
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
      ))}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Configure Command" onAction={() => openCommandPreferences()} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
