import initSqlJs, { Database } from "../../assets/sql-wasm-fts5.js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type DatabaseWrap = {
  spaceID: string;
  database: Database;
};

export type DatabaseLoadIssue = {
  code: "missing-wasm" | "missing-sqlite" | "load-failed";
  message: string;
  path?: string;
  spaceID?: string;
  error?: unknown;
};

export type LoadDatabasesResult = {
  databases: DatabaseWrap[];
  issues: DatabaseLoadIssue[];
  fatalIssue: DatabaseLoadIssue | null;
};

type SqlModule = Awaited<ReturnType<typeof initSqlJs>>;

type DatabaseLoaderDeps = {
  assetsPath: string;
  fileExists: (targetPath: string) => boolean;
  readBinaryFile: (targetPath: string) => Uint8Array;
  initSqlModule: (config: { wasmBinary: ArrayBuffer }) => Promise<SqlModule>;
};

type SpaceInput = {
  path: string;
  spaceID: string;
};

let cachedSqlModulePromise: Promise<SqlModule> | null = null;

const defaultDatabaseLoaderDeps = (assetsPath: string): DatabaseLoaderDeps => ({
  assetsPath,
  fileExists: (targetPath) => existsSync(targetPath),
  readBinaryFile: (targetPath) => readFileSync(targetPath),
  initSqlModule: (config) => initSqlJs(config),
});

export const loadDatabases = async (
  spaces: SpaceInput[],
  assetsPath: string,
  deps: Partial<DatabaseLoaderDeps> = {},
): Promise<LoadDatabasesResult> => {
  if (spaces.length === 0) {
    return { databases: [], issues: [], fatalIssue: null };
  }

  const resolvedDeps = { ...defaultDatabaseLoaderDeps(assetsPath), ...deps };
  const wasmPath = join(resolvedDeps.assetsPath, "sql-wasm-fts5.wasm");

  if (!resolvedDeps.fileExists(wasmPath)) {
    return {
      databases: [],
      issues: [{ code: "missing-wasm", message: "Craft search assets are missing.", path: wasmPath }],
      fatalIssue: { code: "missing-wasm", message: "Craft search assets are missing.", path: wasmPath },
    };
  }

  let sqlModule: SqlModule;

  try {
    sqlModule = await loadSqlModule(wasmPath, resolvedDeps);
  } catch (error) {
    return {
      databases: [],
      issues: [
        {
          code: "load-failed",
          message: "Could not initialize the Craft search database.",
          path: wasmPath,
          error,
        },
      ],
      fatalIssue: {
        code: "load-failed",
        message: "Could not initialize the Craft search database.",
        path: wasmPath,
        error,
      },
    };
  }

  const settledResults = await Promise.allSettled(
    spaces.map(async (space) => {
      if (!resolvedDeps.fileExists(space.path)) {
        throw {
          code: "missing-sqlite",
          message: "A Craft search database is missing.",
          path: space.path,
          spaceID: space.spaceID,
        } as DatabaseLoadIssue;
      }

      return {
        spaceID: space.spaceID,
        database: new sqlModule.Database(resolvedDeps.readBinaryFile(space.path)),
      } as DatabaseWrap;
    }),
  );

  const issues = settledResults.flatMap<DatabaseLoadIssue>((result) => {
    if (result.status === "fulfilled") {
      return [];
    }

    const reason = result.reason as Partial<DatabaseLoadIssue> | undefined;

    if (reason?.code === "missing-sqlite") {
      return [
        {
          code: "missing-sqlite",
          message: reason.message || "A Craft search database is missing.",
          path: reason.path,
          spaceID: reason.spaceID,
        },
      ];
    }

    return [
      {
        code: "load-failed",
        message: "Could not open a Craft search database.",
        path: reason?.path,
        spaceID: reason?.spaceID,
        error: result.reason,
      },
    ];
  });

  const databases = settledResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const fatalIssue = databases.length === 0 && issues.length > 0 ? issues[0] : null;

  return { databases, issues, fatalIssue };
};

export const resetSqlModuleCache = () => {
  cachedSqlModulePromise = null;
};

export const closeDatabases = (databases: DatabaseWrap[]) => {
  databases.forEach(({ database }) => {
    try {
      database.close();
    } catch (error) {
      console.debug(`failed to close database: ${error}`);
    }
  });
};

const loadSqlModule = async (wasmPath: string, deps: DatabaseLoaderDeps) => {
  if (!cachedSqlModulePromise) {
    cachedSqlModulePromise = deps.initSqlModule({
      wasmBinary: toArrayBuffer(deps.readBinaryFile(wasmPath)),
    });
  }

  return cachedSqlModulePromise;
};

const toArrayBuffer = (data: Uint8Array): ArrayBuffer => {
  return Uint8Array.from(data).buffer;
};
