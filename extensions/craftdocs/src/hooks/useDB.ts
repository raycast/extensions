import useConfig from "./useConfig";
import initSqlJs, {Database} from "../../assets/sql-wasm-fts5.js";
import {join} from "path";
import {readFileSync} from "fs";
import {environment} from "@raycast/api";
import {useEffect, useState} from "react";

export default function useDB() {
    const {config, configLoading} = useConfig();
    const [state, setState] = useState({databasesLoading: true, databases: [] as Database[]});

    useEffect(() => {
        if (configLoading) return;
        if (!config) return;

        console.debug('init dbs')

        Promise
            .all(config.spaces.map(space => loadDb(space.path)))
            .then(databases => setState({databases, databasesLoading: false}));
    }, [configLoading]);

    return state;
}

const loadDb = (path: string): Promise<Database> =>
    initSqlJs({locateFile: () => join(environment.assetsPath, "sql-wasm-fts5.wasm")})
        .then(SQL => new SQL.Database(readFileSync(path)));