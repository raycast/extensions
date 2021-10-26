import { environment } from "@raycast/api";
import { CryptoList } from '../types';
import fse from 'fs-extra';
import fs from 'fs';

export const CRYPTO_LIST_PATH = `${environment.supportPath}/cryptoList.json`
fse.ensureFileSync(CRYPTO_LIST_PATH)

type FileCoinListData = {
  timestamp: string,
  cryptoList: CryptoList[]
}

export function writeListInToFile(data: FileCoinListData, callback: fs.NoParamCallback) {
  fs.writeFile(CRYPTO_LIST_PATH, JSON.stringify(data), callback)
}


export function getListFromFile(callback: (err: NodeJS.ErrnoException | null, data: string) => void) {
  return fs.readFile(CRYPTO_LIST_PATH, 'utf8', callback)
}


