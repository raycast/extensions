import fs from "fs";
import initSqlJs, { Database } from "sql.js";
import path from "path";
import util, { TextDecoder } from "util";
import { environment } from "@raycast/api";

export const termsAsParamNames = (terms: string[]): string[] => {
  const p = [];
  for (let i = 0; i < terms.length; i++) {
    p.push(`@t_${i}`);
  }
  return p;
};

export const termsAsParams = (terms: string[]) => {
  return termsAsParamNames(terms).reduce((all: { [key: string]: string }, t, i) => {
    all[t] = `%${terms[i]}%`;
    return all;
  }, {});
};

const fsReadFile = util.promisify(fs.readFile);

export const loadDataToLocalDb = async (sourceDbPath: string, destinationFileName: string): Promise<Database> => {
  const fileBuffer = await fsReadFile(sourceDbPath);
  const SQL = await initSqlJs({
    locateFile: () => path.join(environment.assetsPath, destinationFileName),
  });

  return new SQL.Database(fileBuffer);
};

export function decodeUint8ArrayBlob(blob: Uint8Array): unknown {
  const result = new TextDecoder().decode(blob);
  return result;
}
