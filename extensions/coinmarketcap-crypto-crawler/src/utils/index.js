import { environment } from "@raycast/api";

const fs = require('fs')

export function writeLIstInToFile(data) {
    
    fs.writeFile(`${environment.supportPath}/cryptoList.json`, JSON.stringify(data), err => {
      if (err) {
        console.error(err)
        return
      }
    })
  }


  export function getListFromFile(cb){
    return fs.readFile(`${environment.supportPath}/cryptoList.json`, 'utf8',cb )
  }
