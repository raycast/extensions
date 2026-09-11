import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { v4 as uuidv4 } from "uuid";
import { executeQuery } from "../lib/database";
import { addQueryToHistory, getActiveDatabase, getDatabases, setActiveDatabase } from "../lib/storage";
import { loadFullSchema, ColumnWithTable } from "../lib/schema";
import { Database, QueryHistory, QueryResult } from "../lib/types";
import { addLimitIfNeeded, formatExecutionTime } from "../lib/utils";

export function useDatabases() {
  const { data: databases = [], isLoading, revalidate } = useCachedPromise(getDatabases);
  const [activeDatabaseId, setActiveDatabaseId] = useState<string>("");

  useEffect(() => {
    async function initActiveDatabase() {
      if (databases.length === 0) return;

      const storedActiveId = await getActiveDatabase();
      if (storedActiveId && databases.some((db) => db.id === storedActiveId)) {
        setActiveDatabaseId(storedActiveId);
      } else {
        setActiveDatabaseId(databases[0].id);
        await setActiveDatabase(databases[0].id);
      }
    }
    initActiveDatabase();
  }, [databases]);

  const activeDatabase = useMemo(
    () => databases.find((db) => db.id === activeDatabaseId),
    [databases, activeDatabaseId],
  );

  const changeDatabase = useCallback(async (id: string) => {
    setActiveDatabaseId(id);
    await setActiveDatabase(id);
  }, []);

  return {
    databases,
    activeDatabase,
    activeDatabaseId,
    setActiveDatabaseId: changeDatabase,
    isLoading,
    revalidate,
  };
}

interface ExecuteOptions {
  onSuccess?: (result: QueryResult) => void;
  onError?: (error: Error) => void;
}

export function useQueryExecution(activeDatabase: Database | undefined) {
  const [results, setResults] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const execute = useCallback(
    async (query: string, options?: ExecuteOptions) => {
      if (!query.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "Query is required" });
        return null;
      }

      if (!activeDatabase) {
        await showToast({ style: Toast.Style.Failure, title: "No database selected" });
        return null;
      }

      const queryWithLimit = addLimitIfNeeded(query.trim());
      setIsExecuting(true);

      const toast = await showToast({ style: Toast.Style.Animated, title: "Executing query..." });

      try {
        const result = await executeQuery(activeDatabase.connectionString, queryWithLimit, activeDatabase.isReadonly);
        setResults(result);

        await addQueryToHistory(createHistoryEntry(queryWithLimit, activeDatabase, result.rowCount));

        toast.style = Toast.Style.Success;
        toast.title = "Query executed";
        toast.message = `${result.rowCount} rows in ${formatExecutionTime(result.executionTime)}`;

        options?.onSuccess?.(result);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await addQueryToHistory(createHistoryEntry(queryWithLimit, activeDatabase, undefined, errorMessage));

        toast.style = Toast.Style.Failure;
        toast.title = "Query failed";
        toast.message = errorMessage;

        setResults(null);
        options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    [activeDatabase],
  );

  const clear = useCallback(() => {
    setResults(null);
  }, []);

  return { execute, results, isExecuting, clear };
}

function createHistoryEntry(query: string, database: Database, rowCount?: number, error?: string): QueryHistory {
  return {
    id: uuidv4(),
    query,
    databaseId: database.id,
    databaseName: database.name,
    executedAt: new Date().toISOString(),
    rowCount,
    error,
  };
}

export function useSchemaCache(connectionString: string | undefined) {
  const [tables, setTables] = useState<string[]>([]);
  const [columns, setColumns] = useState<ColumnWithTable[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!connectionString) {
      setTables([]);
      setColumns([]);
      return;
    }

    async function load() {
      setIsLoading(true);
      try {
        const schema = await loadFullSchema(connectionString!);
        const tableNames = schema.tables.map((t) => (t.schema === "public" ? t.name : `${t.schema}.${t.name}`));
        setTables(tableNames);
        setColumns(schema.allColumns);
      } catch {
        // Silent fail - autocomplete just won't work
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [connectionString]);

  return { tables, columns, isLoading };
}
