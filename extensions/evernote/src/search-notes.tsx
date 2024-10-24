import { resolve } from "path";
import { homedir } from "os";
import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import path from "path";
import fs from "fs";
import NotesList from "./components/NotesList";

export default function Command() {
  const [evernoteDB, setEvernoteDB] = useState<string | null>(null);
  const baseDir = resolve(
    homedir(),
    "Library/Application Support/Evernote/conduit-storage/https%3A%2F%2Fwww.evernote.com",
  );

  useEffect(() => {
    if (evernoteDB) {
      return;
    }
    if (!fs.existsSync(baseDir)) {
      return;
    }
    const files = fs.readdirSync(baseDir);
    console.log(files);
    const dbFile = files.find((file) => file.endsWith("+RemoteGraph.sql"));
    if (dbFile) {
      setEvernoteDB(path.join(baseDir, dbFile));
    }
  }, [evernoteDB]);

  if (!evernoteDB) {
    return (
      <List
        isLoading={true}
        searchBarPlaceholder="Searching for Evernote database in ~/Library/Application Support/Evernote/conduit-storage/https%3A%2F%2Fwww.evernote.com"
      >
        <List.Item
          title="Evernote database not found"
          subtitle="Please check if you have Evernote installed and if the database file exists."
          actions={
            <ActionPanel>
              <Action.ShowInFinder path={baseDir} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return <NotesList evernoteDB={evernoteDB} />;
}
