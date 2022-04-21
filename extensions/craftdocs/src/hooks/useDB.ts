import useConfig from "./useConfig";
import initSqlJs, {Database} from "../../assets/sql-wasm-fts5.js";
import {join} from "path";
import {readFileSync} from "fs";
import {environment} from "@raycast/api";
import {useEffect, useState} from "react";

type DatabaseWrap = {
    spaceID: string;
    database: Database;
};

export default function useDB() {
    const {config, configLoading} = useConfig();
    const [{databases, databasesLoading}, setState] = useState({
        databasesLoading: true,
        databases: [] as DatabaseWrap[]
    });

    useEffect(() => {
        if (configLoading) return;
        if (!config) return;

        console.debug('init dbs')

        Promise
            .all(config.spaces.map(space => loadDb(space.path).then(db => ({db, space}))))
            .then(wraps => setState({
                databases: wraps.map(wrap => ({database: wrap.db, spaceID: wrap.space.spaceID})),
                databasesLoading: false
            }));
    }, [configLoading]);

    return {databases, databasesLoading, spaces: config?.spaces};
}

const loadDb = (path: string): Promise<Database> =>
    initSqlJs({locateFile: () => join(environment.assetsPath, "sql-wasm-fts5.wasm")})
        .then(SQL => new SQL.Database(readFileSync(path)));