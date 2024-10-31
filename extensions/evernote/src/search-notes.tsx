import { resolve } from "path";
import { homedir } from "os";
import { showToast, Toast, open, getApplications, popToRoot } from "@raycast/api";
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
    getApplications().then(async (applications) => {
      const isEvernoteInstalled = applications.find(({ bundleId }) => bundleId === "com.evernote.Evernote");
      if (!isEvernoteInstalled) {
        await popToRoot();
        await showToast({
          style: Toast.Style.Failure,
          title: "Evernote client is not installed.",
          message: "Download",
          primaryAction: {
            title: "Go to https://evernote.com/download",
            onAction: (toast) => {
              open("https://evernote.com/download");
              toast.hide();
            },
          },
        });
        return;
      }
      if (evernoteDB) {
        return;
      }
      if (!fs.existsSync(baseDir)) {
        await popToRoot();
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot find Evernote database.",
          message:
            "The database should be in ~/Library/Application Support/Evernote/conduit-storage/https%3A%2F%2Fwww.evernote.com",
        });
        return;
      }
      const files = fs.readdirSync(baseDir);
      console.log(files);
      const dbFile = files.find((file) => file.endsWith("+RemoteGraph.sql"));
      if (dbFile) {
        setEvernoteDB(path.join(baseDir, dbFile));
      }
    });
  }, [evernoteDB]);

  if (!evernoteDB) {
    return;
  }

  return <NotesList evernoteDB={evernoteDB} />;
}
