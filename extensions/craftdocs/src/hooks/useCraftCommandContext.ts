import { showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useRef } from "react";
import useConfig from "./useConfig";
import useCraftEnvironment from "./useCraftEnvironment";
import useDB from "./useDB";
import { reportRecoverableException } from "../utils/reportRecoverableException";

type UseCraftCommandContextOptions = {
  includeDatabases?: boolean;
};

export default function useCraftCommandContext({ includeDatabases = false }: UseCraftCommandContextOptions = {}) {
  const environment = useCraftEnvironment();
  const config = useConfig(environment);
  const db = useDB(config, { enabled: includeDatabases });
  const lastIssueSignature = useRef<string | null>(null);

  const issueSignature = useMemo(() => {
    return JSON.stringify({
      fatalIssue: db.fatalIssue?.code ? `${db.fatalIssue.code}:${db.fatalIssue.path || ""}` : null,
      issues: db.issues.map((issue) => `${issue.code}:${issue.spaceID || ""}:${issue.path || ""}`),
    });
  }, [db.fatalIssue, db.issues]);

  useEffect(() => {
    if (!includeDatabases || issueSignature === lastIssueSignature.current) {
      return;
    }

    db.issues
      .filter((issue) => issue.code === "load-failed")
      .forEach((issue) => reportRecoverableException(issue.error || new Error(issue.message)));

    if (db.fatalIssue) {
      showToast({
        style: Toast.Style.Failure,
        title: "Craft search unavailable",
        message: db.fatalIssue.message,
      });
    } else if (db.issues.length > 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Some Spaces are unavailable",
        message: `${db.issues.length} space${db.issues.length === 1 ? "" : "s"} failed to load.`,
      });
    }

    lastIssueSignature.current = issueSignature;
  }, [db.fatalIssue, db.issues, includeDatabases, issueSignature]);

  return {
    environment,
    config,
    db,
    loading: environment.environmentLoading || config.configLoading || (includeDatabases && db.databasesLoading),
  };
}
