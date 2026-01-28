import packageData from "../package.json"
import { API, data, DocID, Tags } from "../src/data/apis";
import fs from 'fs'

function generateCommand() {
  return Object.keys(data).map((id: string) => {
    const idNum = parseInt(id)
    const itemList = data[idNum as DocID]
    const defaultVersionDocs = Object.keys(itemList)[0]
    const item = data[idNum as DocID][defaultVersionDocs as Tags] as API

    return ({
      "name": DocID[idNum].toLowerCase(),
      "icon": item.icon.replace('../assets', ''),
      "title": DocID[idNum].replace(/_/g, ' '),
      "subtitle": "DocSearch",
      "description": `Search ${DocID[idNum].replace(/_/g, ' ')} documentation`,
      "arguments": [
        {
          "name": "search",
          "placeholder": "Search...",
          "type": "text"
        }
      ],
      "mode": "view"
    })
  })
}

export default function generatePackageEntry() {
  packageData.commands = generateCommand()

  fs.writeFileSync('./package.json', JSON.stringify(packageData))
}

generatePackageEntry()
