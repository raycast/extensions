import { runAppleScript } from "run-applescript";
import { environment } from "@raycast/api";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { homedir } from "os";
import { useRef, useState, useEffect } from "react";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { PermissionError } from "./errors";
import { NoteItem } from "./types";
import Notes from "./Notes";

let SQL: SqlJsStatic;

const loadDatabase = async (path: string) => {
  if (!SQL) {
    const wasmBinary = await readFile(resolve(environment.assetsPath, "sql-wasm.wasm"));
    SQL = await initSqlJs({ wasmBinary });
  }
  const fileContents = await readFile(path);
  return new SQL.Database(fileContents);
};

const NOTES_DB = resolve(homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");

export default function Command() {
  return <Backlinks />;
}

type BacklinksProps = {
  noteId?: string;
};

export function Backlinks({ noteId }: BacklinksProps) {
  const databaseRef = useRef<Database>();
  const [backlinks, setBacklinks] = useState<NoteItem[]>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    (async function () {
      const currNoteId = noteId ?? (await currentNoteId());

      const regex = /x-coredata:\/\/[a-zA-Z0-9-]+\/ICNote\/p(\d+)/;
      const match = currNoteId.match(regex);
      if (!(match && match[1])) {
        setError(new Error("Something went wrong."));
        return;
      }
      const zPK = match[1];

      if (!databaseRef.current) {
        try {
          databaseRef.current = await loadDatabase(NOTES_DB);
        } catch (e) {
          if (e instanceof Error && e.message.includes("operation not permitted")) {
            setError(new PermissionError("You do not have permission to access the database.", "fullDiskAccess"));
          } else {
            setError(e as Error);
          }
          return;
        }
      }

      try {
        const noteUuidStatement = databaseRef.current.prepare(`
          SELECT ZIDENTIFIER
          FROM ZICCLOUDSYNCINGOBJECT
          WHERE Z_PK = :zPK
        `);
        const noteUuidResult = noteUuidStatement.getAsObject({ ":zPK": zPK });
        noteUuidStatement.free();

        const noteUuid = noteUuidResult.ZIDENTIFIER as string;
        const noteLink = `applenotes:note/${noteUuid.toLowerCase()}`;

        const backlinkIdsStatement = databaseRef.current.prepare(`
          SELECT ZNOTE1
          FROM ZICCLOUDSYNCINGOBJECT
          WHERE ZTYPEUTI1 = 'com.apple.notes.inlinetextattachment.link'
            AND ZTOKENCONTENTIDENTIFIER = :noteLink
              AND ZMARKEDFORDELETION IS FALSE
          ORDER BY ZCREATIONDATE2 DESC
        `);
        backlinkIdsStatement.bind({ ":noteLink": noteLink });
        const backlinkIds: number[] = [];
        while (backlinkIdsStatement.step()) {
          const { ZNOTE1: backlinkId } = backlinkIdsStatement.getAsObject();
          backlinkIds.push(backlinkId as number);
        }
        backlinkIdsStatement.free();

        const backlinksStatement = databaseRef.current.prepare(`
          SELECT
            'x-coredata://' || z_uuid || '/ICNote/p' || xcoreDataID AS id,
            noteTitle AS title,
            folderTitle AS folder,
            modDate + 978307200 AS modifiedAt,
            snippet,
            accountName AS account,
            UUID as UUID
          FROM (
            SELECT
            c.ztitle1 AS noteTitle,
            c.zfolder AS noteFolderID,
              c.zmodificationdate1 AS modDate,
              c.z_pk AS xcoredataID,
              c.zaccount4 AS noteAccountID,
              c.zsnippet AS snippet,
              c.zidentifier AS UUID
            FROM ziccloudsyncingobject AS c
              WHERE
                noteTitle IS NOT NULL AND
                  modDate IS NOT NULL AND
                  xcoredataID IS NOT NULL AND
                  c.zmarkedfordeletion != 1
          ) AS notes
              INNER JOIN (
                  SELECT
                      z_pk AS folderID,
                      ztitle2 AS folderTitle,
                      zfoldertype AS isRecentlyDeletedFolder
                  FROM ziccloudsyncingobject
                  WHERE
                      folderTitle IS NOT NULL AND
                      zmarkedfordeletion != 1
              ) AS folders ON noteFolderID = folderID
              LEFT JOIN (
                  SELECT
                      z_pk AS accountID,
                      zname AS accountName
                  FROM ziccloudsyncingobject
              ) as accounts on accountID = noteAccountID
              LEFT JOIN (
                  SELECT z_uuid FROM z_metadata
              )
              WHERE xcoredataID IN (${backlinkIds.join(",")})
              ORDER BY modDate DESC
        `);
        const backlinks: NoteItem[] = [];
        while (backlinksStatement.step()) {
          backlinks.push(backlinksStatement.getAsObject() as unknown as NoteItem);
        }
        backlinksStatement.free();

        setBacklinks(backlinks);
      } catch (e) {
        console.error(e);
        if (error instanceof Error && error.message.includes("operation not permitted")) {
          setError(new PermissionError("You do not have permission to access the database.", "fullDiskAccess"));
        } else {
          setError(e as Error);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return <Notes isLoading={isLoading} error={error} noteItems={backlinks} />;
}

async function currentNoteId(): Promise<string> {
  return await runAppleScript(`tell application "Notes"
    if (count of windows) is equal to 1 or (name of window 1 as string is equal to "Notes") then
      set selectedNote to (get selection as record)
      set noteId to «class seld» of selectedNote
    else
      set noteTitle to name of window 1 as string
      set noteId to id of note noteTitle
    end if
    return noteId
    end tell`);
}
