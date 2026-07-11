import { environment } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { UseConfig } from "./useConfig";
import { closeDatabases, DatabaseLoadIssue, DatabaseWrap, loadDatabases } from "../lib/databaseLoader";

export type UseDB = {
  databasesLoading: boolean;
  databases: DatabaseWrap[];
  issues: DatabaseLoadIssue[];
  fatalIssue: DatabaseLoadIssue | null;
};

type UseDBOptions = {
  enabled?: boolean;
};

export default function useDB(
  { config, configLoading }: Pick<UseConfig, "config" | "configLoading">,
  { enabled = true }: UseDBOptions = {},
) {
  const [{ databases, databasesLoading, issues, fatalIssue }, setState] = useState<UseDB>({
    databasesLoading: enabled,
    databases: [],
    issues: [],
    fatalIssue: null,
  });
  const databasesRef = useRef<DatabaseWrap[]>([]);

  useEffect(() => {
    return () => {
      closeDatabases(databasesRef.current);
      databasesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!enabled || configLoading) {
      return;
    }

    if (!config) {
      closeDatabases(databasesRef.current);
      databasesRef.current = [];
      setState({
        databasesLoading: false,
        databases: [],
        issues: [],
        fatalIssue: null,
      });

      return;
    }

    let cancelled = false;

    setState((previousState) => ({ ...previousState, databasesLoading: true }));

    void loadDatabases(config.spaces, environment.assetsPath).then((result) => {
      if (cancelled) {
        closeDatabases(result.databases);
        return;
      }

      closeDatabases(databasesRef.current);
      databasesRef.current = result.databases;

      setState({
        databases: result.databases,
        databasesLoading: false,
        issues: result.issues,
        fatalIssue: result.fatalIssue,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [config, configLoading, enabled]);

  useEffect(() => {
    if (enabled) {
      return;
    }

    closeDatabases(databasesRef.current);
    databasesRef.current = [];
    setState({
      databasesLoading: false,
      databases: [],
      issues: [],
      fatalIssue: null,
    });
  }, [enabled]);

  return { databases, databasesLoading, issues, fatalIssue };
}
