import {useEffect, useState} from "react";
import {UseAppExists} from "./useAppExists";
import {jxa} from "osascript-tag";
import {handleError} from "./useSearch";

type DevonDBs = {
  isLoading: boolean;
  list: DevonDB[];
};

type DevonDB = {
  uuid: string;
  name: string;
};

const useDevonDB = ({appExists}: UseAppExists) => {
  const [state, setState] = useState<DevonDBs>({isLoading: true, list: []});

  useEffect(() => {
    if (!appExists) {
      setState(prev => ({...prev, isLoading: false}));

      return;
    }

    getDevonDBs()
      .then(list => setState(prev => ({...prev, list})))
      .catch(handleError)
      .finally(() => setState(prev => ({...prev, isLoading: false})));
  }, [appExists]);

  return state;
};

export default useDevonDB;

const getDevonDBs =
// language=JavaScript
  async () =>
    ((await jxa({parse: true})`
        const DT = Application("DEVONthink 3");

        const databases = DT.databases();

        return databases.map(db => ({
            uuid: db.uuid(),
            name: db.name()
        }))
    `) as DevonDB[]);
