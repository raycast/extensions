import { showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback } from "react";
import { analyzeDocument } from "../lib/document";
import { GraphQLEnvironment, SavedQuery } from "../lib/types";
import { ResultView } from "./ResultView";
import { VariablesForm } from "./VariablesForm";

/**
 * Returns a function that runs a saved query: straight to the result when there is nothing to ask,
 * otherwise through the variables form (which also lets the user pick the operation of a multi-operation document).
 */
export function useRunQuery() {
  const { push } = useNavigation();

  return useCallback(
    async (query: SavedQuery, env: GraphQLEnvironment | undefined): Promise<boolean> => {
      if (!env) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No environment selected",
          message: "Edit the query and pick an environment",
        });
        return false;
      }

      const info = analyzeDocument(query.query);
      if (info.error) {
        await showToast({ style: Toast.Style.Failure, title: "Invalid query", message: info.error });
        return false;
      }
      const runnable = info.operations.filter((operation) => operation.type !== "subscription");
      if (runnable.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "Subscriptions can't be run over HTTP" });
        return false;
      }

      if (runnable.length === 1 && runnable[0].variables.length === 0) {
        push(
          <ResultView
            title={query.name}
            env={env}
            fileName={query.id}
            request={{ query: query.query, operationName: runnable[0].name }}
          />,
        );
      } else {
        push(<VariablesForm queryId={query.id} environmentId={env.id} />);
      }
      return true;
    },
    [push],
  );
}
