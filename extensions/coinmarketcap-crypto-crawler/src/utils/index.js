import { environment } from "@raycast/api";

const fs = require('fs')
const cryptoListPath = `${environment.supportPath}/cryptoList.json`

export function writeLIstInToFile(data, callback) {
  fs.writeFile(cryptoListPath, JSON.stringify(data), callback)
}


export function getListFromFile(callback) {
  return fs.readFile(cryptoListPath, 'utf8', callback)
}
