// Import necessary modules and dependencies
import { environment } from "@raycast/api";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { homedir } from "os";
import { useRef, useState, useEffect } from "react";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { PermissionError } from "./errors";
import { SnippetItem } from "./types";

// Initialize a variable to hold the SqlJsStatic object
let SQL: SqlJsStatic;

// Function to load the database from a file path
const loadDatabase = async (path: string) => {
  // Check if SQL object is already initialized
  if (!SQL) {
    // Read the WebAssembly binary
    const wasmBinary = await readFile(resolve(environment.assetsPath, "sql-wasm.wasm"));
    // Initialize SqlJs with the WebAssembly binary
    SQL = await initSqlJs({ wasmBinary });
  }

  // Read the file contents and return a new database instance
  const fileContents = await readFile(path);
  return new SQL.Database(fileContents);
};

// Custom hook for executing SQL queries on a database
const useSql = <Result>(path: string, query: string) => {
  const databaseRef = useRef<Database>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [results, setResults] = useState<Result[]>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    (async () => {
      if (!databaseRef.current) {
        try {
          // Load the database if it's not already loaded
          databaseRef.current = await loadDatabase(path);
        } catch (e) {
          if (e instanceof Error && e.message.includes("operation not permitted")) {
            // Handle permission error
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
          // Handle permission error
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
    // Clean up when component is unmounted
    return () => {
      console.log("close");
      databaseRef.current?.close();
    };
  }, []);

  return { results, error, isLoading };
};

// Define the path to the notes database and the SQL query
const NOTES_DB = resolve(homedir(), "Library/Group Containers/group.com.timoeichelmann.CodeSnipper/private.sqlite");

const notesQuery = `
SELECT
'x-coredata://' || z_uuid || xcoreDataID AS id,
noteTitle AS title,
folderTitle AS folder,
datetime (modDate + 978307200,
  'unixepoch') AS modifiedAt,
snippet AS snippet,
UUID AS UUID,
code AS code,
language AS language
FROM (
SELECT
  c.zname AS noteTitle,
  c.zfolder AS noteFolderID,
  c.zupdateddate AS modDate,
  c.z_pk AS xcoredataID,
  c.zaicontent AS snippet,
  c.zid AS UUID,
  c.zoriginalcontent AS code,
  c.zlanguagetype AS language
FROM
  ZCODESNIPPET AS c) AS notes
INNER JOIN (
  SELECT
    z_pk AS folderID,
    zname AS folderTitle
  FROM
    zfolder) AS folders ON noteFolderID = folderID
LEFT JOIN (
  SELECT
    z_uuid
  FROM
    z_metadata)
`;

// Custom hook for executing SQL queries on the notes database
export const useSqlNotes = () => useSql<SnippetItem>(NOTES_DB, notesQuery);
