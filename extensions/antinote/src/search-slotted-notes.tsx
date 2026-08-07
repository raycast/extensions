import { ActionPanel, Action, Icon, List, Detail, closeMainWindow } from "@raycast/api";
import { runAppleScript, showFailureToast, useSQL } from "@raycast/utils";
import { checkAntinoteInstalled } from "./utils";
import { useEffect, useState } from "react";
import { STABLE_DB_PATH, BETA_DB_PATH, SETAPP_DB_PATH } from "./constants";

type Note = {
  id: string;
  content: string;
  created: string;
  lastModified: string;
  slot: number;
};

const iconMap = [ 
  "",
  "planets/Mercury.png",
  "planets/Venus.png",
  "planets/Earth.png",
  "planets/Mars.png",
  "planets/Jupiter.png",
  "planets/Saturn.png",
  "planets/Uranus.png",
  "planets/Neptune.png",
  "planets/Pluto.png", 
];

const query = `
  SELECT id, content, created, lastModified
  FROM notes
  WHERE content IS NOT ''
  ORDER BY lastModified DESC
`;

const beta_query = `
SELECT upper(
    substr(hex(ZID), 1, 8)  || '-' ||
    substr(hex(ZID), 9, 4)  || '-' ||
    substr(hex(ZID), 13, 4) || '-' ||
    substr(hex(ZID), 17, 4) || '-' ||
    substr(hex(ZID), 21, 12)
) AS id, ZCONTENT as content, ZCREATED as created, ZLASTMODIFIED as lastModified, ZSLOTINDEX as slot
  FROM ZNOTE
  WHERE ZCONTENT IS NOT '' AND ZISSLOTTED = 1
  ORDER BY ZSLOTINDEX ASC
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

function resolveDb(version: string | null) {
  switch (version) {
    case "setapp":
      return useSQL<Note>(SETAPP_DB_PATH, query);
    case "beta":
      return useSQL<Note>(BETA_DB_PATH, beta_query);
    default:
      return useSQL<Note>(STABLE_DB_PATH, query);
  }
}

export default function Command() {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const { isLoading, data: notes, permissionView } = resolveDb(version);

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

  if (version !== "beta") {
    return <Detail markdown="Slotted notes are only available in Antinote v2.* (beta)" />;
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
      icon: iconMap[note.slot],
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
