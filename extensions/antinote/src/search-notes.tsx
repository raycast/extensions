import { ActionPanel, Action, Icon, List, Detail, closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast, useSQL } from "@raycast/utils";
import { homedir } from "os";
import { resolve } from "path";
import { checkAntinoteInstalled } from "./utils";
import { useEffect, useState } from "react";

type Note = {
  id: string;
  content: string;
  created: string;
  lastModified: string;
};

const DB_PATH = resolve(homedir(), "Library/Containers/com.chabomakers.Antinote/Data/Documents/notes.sqlite3");
const SETAPP_DB_PATH = resolve(
  homedir(),
  "Library/Containers/com.chabomakers.Antinote-setapp/Data/Documents/notes.sqlite3",
);

const query = `
  SELECT id, content, created, lastModified
  FROM notes
  WHERE content IS NOT ''
  ORDER BY lastModified DESC
`;

function getTitle(content: string) {
  return content.trim().split("\n")[0];
}

function getSanitizedContent(content: string) {
  content = content.trim();
  const splitted = content
    .split("\n")
    .slice(1)
    .filter((line) => line.trim().length > 0);
  content = splitted.join(" | ");
  return content.length > 50 ? content.slice(0, 47) + "..." : content;
}

async function openInAntinote(noteId: string) {
  try {
    await runAppleScript(`
      tell application "Antinote"
        activate
        delay 0.3
        open location "antinote://x-callback-url/promoteAndOpen?noteId=${noteId}"
      end tell
    `);
    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open in Antinote" });
  }
}

export default function Command() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const {
    isLoading,
    data: notes,
    permissionView,
  } = useSQL<Note>(version === "setapp" ? SETAPP_DB_PATH : DB_PATH, query);

  useEffect(() => {
    async function checkInstallation() {
      const { installed, version } = await checkAntinoteInstalled();
      setIsInstalled(installed);
      setVersion(version);
    }

    checkInstallation();
  }, []);

  if (isInstalled === null) {
    return <List isLoading={true} />;
  }

  if (isInstalled === false) {
    return <Detail markdown="Antinote is not installed." />;
  }

  if (permissionView) {
    return permissionView;
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!isLoading && !notes) {
    return <Detail markdown="No notes found." />;
  }

  const ITEMS = notes!.map((note) => {
    return {
      id: note.id,
      icon: Icon.Paragraph,
      title: getTitle(note.content),
      subtitle: getSanitizedContent(note.content),
    };
  });

  return (
    <List>
      {ITEMS.map((item) => (
        <List.Item
          key={item.id}
          icon={item.icon}
          title={item.title}
          subtitle={item.subtitle}
          actions={
            <ActionPanel>
              <Action
                title="Find in Antinote"
                onAction={async () => {
                  openInAntinote(item.id);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
