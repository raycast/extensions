import {useEffect, useState} from "react";
import {showToast, Toast} from "@raycast/api";
import {jxa} from "osascript-tag";
import Style = Toast.Style;

type State = {
  isLoading: boolean;
  results: SearchResult[];
};

export type SearchResult = {
  uuid: string;
  name: string;
  score: number;
}

const useSearch = (query: string) => {
  const [state, setState] = useState<State>({isLoading: true, results: []})

  useEffect(() => {
    if (query.length === 0) {
      setState(prev => ({...prev, isLoading: false}));
      return;
    }

    Promise.resolve()
      .then(() => setState(prev => ({...prev, isLoading: true})))
      .then(() => searchInDEVONThink(query))
      .then(results => setState(prev => ({...prev, results})))
      .catch(handleError)
      .finally(() => setState(prev => ({...prev, isLoading: false})))
  }, [query]);

  return state;
};

export default useSearch;

const searchInDEVONThink = async (query: string) => {
  const results =  (await jxa({parse: true})`
      const DT = Application("DEVONthink 3");
    
      const results = DT.search("${query}");
      
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
        type: result.type(),
      }));
   ` as SearchResult[]);

  return results.sort((a, b) => b.score - a.score);
};

const handleError = (err: Error) => {
  console.log(err);
  return showToast(Style.Failure, err.message);
}
