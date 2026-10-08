import { resolve } from "path";
import { homedir } from "os";
import { showToast, Toast, open, getApplications, popToRoot } from "@raycast/api";
import { useState, useEffect } from "react";
import path from "path";
import fs from "fs";

/** Evernote conduit DB directory candidates for the current OS (`process.platform`). */
export function getKnownEvernoteDirLocations(): string[] {
  const platform = process.platform;
  if (platform === "darwin") {
    return [
      resolve(
        homedir(),
        "Library/Containers/com.evernote.Evernote/Data/Library/Application Support/Evernote/conduit-storage/https%3A%2F%2Fwww.evernote.com",
      ),
      resolve(homedir(), "Library/Application Support/Evernote/conduit-storage/https%3A%2F%2Fwww.evernote.com"),
    ];
  }
  if (platform === "win32") {
    return [resolve(homedir(), "AppData/Roaming/Evernote/conduit-storage/https%3A%2F%2Fwww.evernote.com")];
  }
  return [];
}

export function useEvernoteDB(): string | null {
  const [evernoteDB, setEvernoteDB] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getApplications().then(async (applications) => {
      if (cancelled) {
        return;
      }
      const isEvernoteInstalled = applications.find(
        ({ bundleId, name }) => bundleId === "com.evernote.Evernote" || name === "Evernote",
      );
      if (!isEvernoteInstalled) {
        await popToRoot();
        if (cancelled) {
          return;
        }
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
      let baseDir: string | null = null;
      const knownEvernoteDirLocations = getKnownEvernoteDirLocations();
      for (const directory of knownEvernoteDirLocations) {
        if (fs.existsSync(directory)) {
          baseDir = directory;
          break;
        }
      }
      if (!baseDir || !fs.existsSync(baseDir)) {
        await popToRoot();
        if (cancelled) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot find Evernote database.",
          message:
            "The database should be in the Evernote conduit-storage directory, but could not be found. Ensure the Evernote desktop client has been run at least once.",
        });
        return;
      }
      const files = fs.readdirSync(baseDir);
      const dbFile = files.find((file) => file.endsWith("+RemoteGraph.sql"));
      if (dbFile) {
        if (cancelled) {
          return;
        }
        setEvernoteDB(path.join(baseDir, dbFile));
      } else {
        await popToRoot();
        if (cancelled) {
          return;
        }
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot find Evernote database.",
          message:
            "The database should be in the Evernote conduit-storage directory, but could not be found. Ensure the Evernote desktop client has been run at least once.",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return evernoteDB;
}
