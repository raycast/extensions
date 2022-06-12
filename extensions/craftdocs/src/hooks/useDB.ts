import { UseConfig } from "./useConfig";
import initSqlJs, { Database } from "../../assets/sql-wasm-fts5.js";
import { join } from "path";
import { readFileSync } from "fs";
import { environment } from "@raycast/api";
import { useEffect, useState } from "react";

export type UseDB = {
  databasesLoading: boolean;
  databases: DatabaseWrap[];
};

type DatabaseWrap = {
  spaceID: string;
  database: Database;
};

export default function useDB({ config, configLoading }: UseConfig) {
  const [{ databases, databasesLoading }, setState] = useState<UseDB>({
    databasesLoading: true,
    databases: [] as DatabaseWrap[],
  });

  useEffect(() => {
    if (configLoading) return;
    if (!config) return;

    Promise.all(config.spaces.map((space) => loadDb(space.path).then((db) => ({ db, space }))))
      .then((wraps) =>
        setState({
          databases: wraps.map((wrap) => ({ database: wrap.db, spaceID: wrap.space.spaceID })),
          databasesLoading: false,
        })
      )
      .then(() => console.debug("initialized databases " + config.spaces.map((space) => space.spaceID).join(", ")));
  }, [configLoading]);

  return { databases, databasesLoading, spaces: config?.spaces };
}

const loadDb = (path: string): Promise<Database> =>
  initSqlJs({ locateFile: () => join(environment.assetsPath, "sql-wasm-fts5.wasm") }).then(
    (SQL) => new SQL.Database(readFileSync(path))
  );
