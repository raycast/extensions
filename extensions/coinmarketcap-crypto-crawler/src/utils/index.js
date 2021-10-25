import { environment } from "@raycast/api";
const fse = require('fs-extra')
const fs = require('fs')

const cryptoListPath = `${environment.supportPath}/cryptoList.json`
fse.ensureFileSync(cryptoListPath)

export function writeListInToFile(data, callback) {
  fs.writeFile(cryptoListPath, JSON.stringify(data), callback)
}


export function getListFromFile(callback) {
  return fs.readFile(cryptoListPath, 'utf8', callback)
}
