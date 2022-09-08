import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { jxa } from "osascript-tag";
import Style = Toast.Style;
import { UseAppExists } from "./useAppExists";

type State = {
  isLoading: boolean;
  results: SearchResult[];
};

export type SearchResult = {
  uuid: string;
  name: string;
  score: number;
  path: string;
  tags: string[];
};

const useSearch = ({ appExists }: UseAppExists, query: string, databaseUUID: string) => {
  const [state, setState] = useState<State>({ isLoading: true, results: [] });

  useEffect(() => {
    if (!appExists || query.length === 0) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    Promise.resolve()
      .then(() => setState((prev) => ({ ...prev, isLoading: true })))
      .then(() => searchInDEVONThink(databaseUUID, query))
      .then((results) => setState((prev) => ({ ...prev, results })))
      .catch(handleError)
      .finally(() => setState((prev) => ({ ...prev, isLoading: false })));
  }, [appExists, query, databaseUUID]);

  return state;
};

export default useSearch;

const searchInDEVONThink = async (databaseUUID: string, query: string) => {
  // language=JavaScript
  const results = (await jxa({ parse: true })`
      const DT = Application("DEVONthink 3");

      let results;

      if ("${databaseUUID}" === "") {
          results = DT.search('${query.replaceAll("'", "\\'")}');
      } else {
          const database = DT.getRecordWithUuid("${databaseUUID}");
          results = DT.search('${query.replaceAll("'", "\\'")}', {in: database});
      }


      if (results.length === 0) {
          return [];
      }

      return results.map(result => ({
          uuid: result.uuid(),
          name: result.name(),
          score: result.score(),
          tags: result.tags(),
          path: result.path(),
          location: result.location(),
          type: result.type()
      }));
  `) as SearchResult[];

  return results.sort((a, b) => b.score - a.score);
};

export const handleError = (err: string) => {
  console.log(err);
  return showToast(Style.Failure, "Failed to perform the operation", err);
};
