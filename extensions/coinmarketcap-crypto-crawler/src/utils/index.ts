import { environment } from "@raycast/api";
import { CryptoCurrency } from "../types";
import fse from "fs-extra";
import fs from "fs";
import { fetchAllCrypto } from "../api";

export const CRYPTO_LIST_PATH = `${environment.supportPath}/cryptoList.json`;
fse.ensureFileSync(CRYPTO_LIST_PATH);

type FileCoinListData = {
  timestamp: string;
  cryptoList: CryptoCurrency[];
};

export function writeListInToFile(data: FileCoinListData, callback: fs.NoParamCallback) {
  fs.writeFile(CRYPTO_LIST_PATH, JSON.stringify(data), callback);
}

export function getListFromFile(callback: (err: NodeJS.ErrnoException | null, data: string) => void) {
  return fs.readFile(CRYPTO_LIST_PATH, "utf8", callback);
}

export function refreshExistingCache(callback: (err: NodeJS.ErrnoException | null, list: CryptoCurrency[]) => void) {
  fetchAllCrypto({ limit: 10000, start: 1 })
    .then(({ data: resultData }) => {
      const { data, status } = resultData;

      const cryptoList: CryptoCurrency[] = data.cryptoCurrencyMap.map(({ slug, name, symbol }) => ({
        slug,
        name,
        symbol: symbol.toLowerCase(),
      }));

      writeListInToFile(
        {
          timestamp: status.timestamp,
          cryptoList: cryptoList,
        },
        (writeFileError) => {
          callback(writeFileError, cryptoList);
        },
      );
    })
    .catch((error) => {
      callback(error, []);
    });
}

export function refreshExistingCacheAsync(): Promise<CryptoCurrency[]> {
  return new Promise((resolve, reject) => {
    refreshExistingCache((err, list) => {
      if (err) {
        reject(err);
      } else {
        resolve(list);
      }
    });
  });
}
