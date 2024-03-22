import { resolve } from "path";
import { homedir } from "os";
import { useSQL } from "@raycast/utils";

export type NoteItem = {
  id: string;
  UUID: string;
  title: string;
  modifiedAt?: Date;
  folder: string;
  snippet: string;
  account: string;
};

const NOTES_DB = resolve(homedir(), "Library/Group Containers/group.com.apple.notes/NoteStore.sqlite");

const query = `
    SELECT
        'x-coredata://' || z_uuid || '/ICNote/p' || xcoreDataID AS id,
        noteTitle AS title,
        folderTitle AS folder,
        datetime(modDate + 978307200, 'unixepoch') AS modifiedAt,
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
        FROM
            ziccloudsyncingobject AS c
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
    ORDER BY modDate DESC
  `;

export const useNotes = () => useSQL<NoteItem>(NOTES_DB, query);
