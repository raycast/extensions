import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { jxa } from "osascript-tag";
import { UseAppExists } from "./useAppExists";
import { SearchResult } from "../types/SearchResult";
import Style = Toast.Style;

type State = {
  isLoading: boolean;
  results: SearchResult[];
};

const useSearch = ({ appExists, appName }: UseAppExists, query: string, databaseUUID: string) => {
  const [state, setState] = useState<State>({ isLoading: true, results: [] });

  useEffect(() => {
    if (!appExists || query.length === 0) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    Promise.resolve()
      .then(() => setState((prev) => ({ ...prev, isLoading: true })))
      .then(() => searchInDEVONThink(appName, databaseUUID, query))
      .then((results) => setState((prev) => ({ ...prev, results })))
      .catch(handleError)
      .finally(() => setState((prev) => ({ ...prev, isLoading: false })));
  }, [appExists, query, databaseUUID]);

  return state;
};

export default useSearch;

const searchInDEVONThink = async (appName: string, databaseUUID: string, query: string) => {
  // language=JavaScript
  const resultsString = (await jxa({ parse: true })`
      const DT = Application("${appName}");

      let results;

      if ("${databaseUUID}" === "") {
          results = DT.search('${query.replaceAll("'", "\\'")}');
      } else {
          const database = DT.getRecordWithUuid("${databaseUUID}");
          results = DT.search('${query.replaceAll("'", "\\'")}', {in: database});
      }


      if (results.length === 0) {
          return "[]";
      }

      return JSON.stringify(results.slice(0, 20).map(result => result.properties()));
  `) as string;

  const results = JSON.parse(resultsString) as SearchResult[];

  return results.sort((a, b) => b.score - a.score);
};

export const handleError = (err: string) => {
  console.log(err);
  return showToast(Style.Failure, "Failed to perform the operation", err);
};
