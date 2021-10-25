import { environment } from "@raycast/api";
import { CryptoList } from '../types';
import fse from 'fs-extra';
import fs from 'fs';

const cryptoListPath = `${environment.supportPath}/cryptoList.json`
fse.ensureFileSync(cryptoListPath)

type FileCoinListData = {
  timestamp: string,
  cryptoList: CryptoList[]
}

export function writeListInToFile(data: FileCoinListData, callback: fs.NoParamCallback) {
  fs.writeFile(cryptoListPath, JSON.stringify(data), callback)
}


export function getListFromFile(callback: (err: NodeJS.ErrnoException | null, data: string) => void) {
  return fs.readFile(cryptoListPath, 'utf8', callback)
}
