import { environment } from "@raycast/api";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { homedir } from "os";
import { useRef, useState, useEffect } from "react";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { PermissionError } from "./errors";
import { NoteItem } from "./types";

let SQL: SqlJsStatic;

const loadDatabase = async (path: string) => {
  if (!SQL) {
    const wasmBinary = await readFile(resolve(environment.assetsPath, "sql-wasm.wasm"));
    SQL = await initSqlJs({ wasmBinary });
  }
  const fileContents = await readFile(path);
  return new SQL.Database(fileContents);
};

const useSql = <Result>(path: string, query: string) => {
  const databaseRef = useRef<Database>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [results, setResults] = useState<Result[]>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    (async () => {
      if (!databaseRef.current) {
        try {
          databaseRef.current = await loadDatabase(path);
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
        const newResults = new Array<Result>();
        const statement = databaseRef.current.prepare(query);
        while (statement.step()) {
          newResults.push(statement.getAsObject() as unknown as Result);
        }

        setResults(newResults);

        statement.free();
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
  }, [path, query]);

  useEffect(() => {
    return () => {
      databaseRef.current?.close();
    };
  }, []);

  return { results, error, isLoading };
};

const NOTES_DB = resolve(homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");

const notesQuery = `
    SELECT
        'x-coredata://' || z_uuid || '/ICNote/p' || xcoreDataID AS id,
        noteTitle AS title,
        folderTitle AS folder,
        datetime(modDate + 978307200, 'unixepoch') AS modifiedAt,
        snippet,
        accountName AS account,
        UUID as UUID,
        zippedNoteBody,
        ocrText,
        tags
    FROM (
        SELECT
            c.ztitle1 AS noteTitle,
            c.zfolder AS noteFolderID,
            c.zmodificationdate1 AS modDate,
            c.z_pk AS xcoredataID,
            c.zaccount4 AS noteAccountID,
            c.zsnippet AS snippet,
            c.zidentifier AS UUID,
            n.zdata AS zippedNoteBody
        FROM
            ziccloudsyncingobject AS c
            INNER JOIN zicnotedata AS n ON c.znotedata = n.z_pk -- note id (int) distinct from xcoredataID
        WHERE
            noteTitle IS NOT NULL AND
            modDate IS NOT NULL AND
            xcoredataID IS NOT NULL AND
            zippedNoteBody IS NOT NULL AND
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
    LEFT JOIN (
      SELECT
          CAST(ZNOTE AS TEXT) as noteID,
          IFNULL(GROUP_CONCAT(ZHANDWRITINGSUMMARY, ''), '') 
                 || IFNULL(GROUP_CONCAT(ZOCRSUMMARY, ''), '') as ocrText
      FROM
          ZICCLOUDSYNCINGOBJECT
      WHERE
          (
              ZOCRSUMMARY IS NOT NULL
              OR ZHANDWRITINGSUMMARY IS NOT NULL
          )
      GROUP BY
          ZNOTE
    ) as OCR on noteID = xcoredataID
    LEFT JOIN (
      SELECT
          CAST(ZNOTE1 AS TEXT) as tagNoteID,
          GROUP_CONCAT(ZALTTEXT, ' ') as tags
      FROM
          ZICCLOUDSYNCINGOBJECT
      WHERE
          ZTYPEUTI1 = 'com.apple.notes.inlinetextattachment.hashtag'
      GROUP BY
          ZNOTE1
    ) as tag on tagNoteID = xcoredataID
    ORDER BY modDate DESC
  `;

export const useSqlNotes = () => useSql<NoteItem>(NOTES_DB, notesQuery);
