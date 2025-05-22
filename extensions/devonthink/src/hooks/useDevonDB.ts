import { useEffect, useState } from "react";
import { UseAppExists } from "./useAppExists";
import { jxa } from "osascript-tag";
import { handleError } from "./useSearch";

type DevonDBs = {
  databasesAreLoading: boolean;
  databases: DevonDB[];
};

type DevonDB = {
  uuid: string;
  name: string;
};

const useDevonDB = ({ appExists }: UseAppExists) => {
  const [state, setState] = useState<DevonDBs>({ databasesAreLoading: true, databases: [] });

  useEffect(() => {
    if (!appExists) {
      setState((prev) => ({ ...prev, databasesAreLoading: false }));

      return;
    }

    getDevonDBs()
      .then((list) => setState((prev) => ({ ...prev, databases: list })))
      .catch(handleError)
      .finally(() => setState((prev) => ({ ...prev, databasesAreLoading: false })));
  }, [appExists]);

  return state;
};

export default useDevonDB;

const getDevonDBs =
  // language=JavaScript
  async () =>
    (await jxa({ parse: true })`
        const DT = Application("DEVONthink");

        const databases = DT.databases();

        return databases.map(db => ({
            uuid: db.uuid(),
            name: db.name()
        }))
    `) as DevonDB[];
