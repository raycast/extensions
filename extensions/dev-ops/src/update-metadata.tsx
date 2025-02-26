import mysql from "mysql2/promise";
import { Action, ActionPanel, List } from "@raycast/api";
// Get the client

import { getPreferenceValues } from "@raycast/api";
import React, { useCallback, useEffect, useState, useRef } from "react";

const TABLES = ["meta_default", "meta_enum", "meta_attr"];

const TABLES_REVERSE = [...TABLES].reverse();

interface Preferences {
  databaseSourceConnectionString: string;
  databaseTargetConnectionStrings: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const [state, setState] = useState({
    targetConnectionStrings: [] as string[],
  });

  const connectionPoolsRef = useRef<Record<string, mysql.Pool>>({});

  const getConnectionPool = useCallback(async (connectionString: string) => {
    if (!connectionPoolsRef.current[connectionString]) {
      connectionPoolsRef.current[connectionString] = await getDatabaseConnectionPool(connectionString);
    }
    return connectionPoolsRef.current[connectionString];
  }, []);

  const releaseConnectionPool = useCallback((connectionString: string) => {
    if (connectionPoolsRef.current[connectionString]) {
      connectionPoolsRef.current[connectionString].end();
      delete connectionPoolsRef.current[connectionString];
    }
  }, []);

  useEffect(() => {
    const targetConnectionStrings = preferences.databaseTargetConnectionStrings.split(",");
    setState({
      ...state,
      targetConnectionStrings: targetConnectionStrings,
    });
  }, []);

  const [progressText, setProgressText] = useState("");

  const updateMetadata = useCallback(
    async (sourceConnectionString: string, targetConnectionString: string) => {
      setProgressText((prev) => prev + "\n\n Dropping tables\n-");

      const targetConnectionPool = await getConnectionPool(targetConnectionString);
      const sourceConnectionPool = await getConnectionPool(sourceConnectionString);

      for (const table of TABLES) {
        setProgressText((prev) => prev + " " + table);
        await dropTable(targetConnectionString, table, targetConnectionPool);
      }

      setProgressText((prev) => prev + "\n\n Creating tables\n-");
      for (const table of TABLES_REVERSE) {
        const createStatement = await generateCreateTableStatement(sourceConnectionString, table, sourceConnectionPool);
        setProgressText((prev) => prev + " " + table);
        await createTable(targetConnectionString, table, createStatement, targetConnectionPool);
      }

      setProgressText((prev) => prev + "\n\n Pulling down data\n-");

      for (const table of TABLES_REVERSE) {
        let pageNumber = 1;
        const pageSize = 1000; // Reduced page size for better memory management
        setProgressText((prev) => prev + " " + table);

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const result = await createInsertStatement(
            sourceConnectionString,
            table,
            pageSize,
            pageNumber,
            await getConnectionPool(sourceConnectionString),
          );
          if (result.insertStatement) {
            await insertData(
              targetConnectionString,
              table,
              result.insertStatement,
              await getConnectionPool(targetConnectionString),
            );
          }

          if (result.length < pageSize) {
            break;
          }
          pageNumber++;
        }
      }

      setProgressText((prev) => prev + "\n\n Done");

      releaseConnectionPool(sourceConnectionString);
      releaseConnectionPool(targetConnectionString);
    },
    [progressText, getConnectionPool, releaseConnectionPool],
  );

  return (
    <List isShowingDetail={progressText.length > 0}>
      {state.targetConnectionStrings.map((targetConnectionString) => (
        <List.Item
          key={targetConnectionString}
          title={targetConnectionString}
          detail={<List.Item.Detail markdown={progressText} />}
          actions={
            <ActionPanel>
              <Action
                title="Update Metadata"
                onAction={() => updateMetadata(preferences.databaseSourceConnectionString, targetConnectionString)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

async function getDatabaseConnectionPool(connectionString: string) {
  const connection = await mysql.createPool({
    uri: connectionString,
  });

  return connection;
}

async function generateCreateTableStatement(
  databaseConnectionString: string,
  tableName: string,
  connectionPool: mysql.Pool,
) {
  interface ShowCreateTableResult extends mysql.RowDataPacket {
    "Create Table": string;
  }
  const [rows] = await connectionPool.execute<ShowCreateTableResult[]>(`SHOW CREATE TABLE ${tableName}`);
  return rows[0]["Create Table"];
}

async function createInsertStatement(
  databaseConnectionString: string,
  tableName: string,
  pageSize: number,
  pageNumber: number,
  connectionPool: mysql.Pool,
) {
  interface QueryRow extends mysql.RowDataPacket {
    [key: string]: unknown;
  }
  const [results] = await connectionPool.query<QueryRow[]>(
    `SELECT * FROM ${tableName} LIMIT ${pageSize} OFFSET ${(pageNumber - 1) * pageSize}`,
  );

  if (!Array.isArray(results) || !results.length) {
    return {
      insertStatement: "",
      pageNumber,
      pageSize,
      results,
      length: 0,
    };
  }

  // Get column names from the first result
  const columns = Object.keys(results[0]);

  // Create the base insert statement with column names
  const insertStatement = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES ${results
    .map(
      (row) =>
        `(${columns
          .map((col) => {
            const value = row[col];
            if (value === null) return "NULL";
            if (typeof value === "number") return value;
            if (typeof value === "boolean") return value ? 1 : 0;
            return `'${value?.toString().replace(/'/g, "''")}'`; // Escape single quotes
          })
          .join(", ")})`,
    )
    .join(",\n")}`;

  return {
    insertStatement,
    pageNumber,
    pageSize,
    results,
    length: results.length,
  };
}

async function dropTable(databaseConnectionString: string, tableName: string, connectionPool: mysql.Pool) {
  await connectionPool.execute(`DROP TABLE IF EXISTS ${tableName}`);
}

async function createTable(
  databaseConnectionString: string,
  tableName: string,
  createTableQuery: string,
  connectionPool: mysql.Pool,
) {
  await connectionPool.execute(createTableQuery);
}

async function insertData(
  databaseConnectionString: string,
  tableName: string,
  insertStatement: string,
  connectionPool: mysql.Pool,
) {
  await connectionPool.execute(insertStatement);
}
