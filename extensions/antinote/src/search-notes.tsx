import { ActionPanel, Action, Icon, List, Detail, closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast, useSQL } from "@raycast/utils";
import { homedir } from "os";
import { resolve } from "path";

type Note = {
  content: string;
  created: string;
  lastModified: string;
};

const DB_PATH = resolve(homedir(), "Library/Containers/com.chabomakers.Antinote/Data/Documents/notes.sqlite3");

const query = `
  SELECT content, created, lastModified
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

async function searchInAntinote(note: Note) {
  let splitted = note.content.trim().split("\n");
  if (splitted.length > 1) {
    splitted = splitted.slice(0, -1);
  }
  const query = splitted.join(" ").slice(0, 50);

  try {
    await runAppleScript(`
      tell application "Antinote"
        activate
        tell application "System Events"
          tell application process "Antinote"
            click menu item "search all notes" of menu "file" of menu bar 1
            if (count of static text of group 1 of window 1) > 0 and value of static text 1 of group 1 of window 1 is "Search all notes" then
            else
              delay 0.7
              click menu item "search all notes" of menu "file" of menu bar 1
            end if
            set value of text field 1 of group 1 of window 1 to "${query}"
          end tell
        end tell
      end tell
    `);

    await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to search in Antinote" });
  }
}

export default function Command() {
  const { isLoading, data: notes, permissionView } = useSQL<Note>(DB_PATH, query);

  if (permissionView) {
    return permissionView;
  }

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (!isLoading && !notes) {
    return <Detail markdown="No notes found." />;
  }

  const ITEMS = notes!.map((note, key) => {
    return {
      id: key,
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
                  searchInAntinote(notes![item.id]);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
