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
type FileStreamCallback = (err: string, data: string) => void;


export function writeListInToFile(data: FileCoinListData, callback: FileStreamCallback) {
  fs.writeFile(cryptoListPath, JSON.stringify(data), callback)
}


export function getListFromFile(callback: FileStreamCallback) {
  return fs.readFile(cryptoListPath, 'utf8')
}
