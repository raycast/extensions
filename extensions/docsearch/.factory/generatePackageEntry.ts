import data from "../src/data/apis";
import packageData from "../package.json"
import fs from 'fs'

const langMap: { [key:string]: string} = {
  "zh-Hans": "中文",
}

function generateCommand() {
  return data.map((item) => ({
    "name": (item.name.toLowerCase() + (item.lang ? '_'+item.lang: '')).replace(' ','_'),
    "icon": item.icon.replace('../assets', ''),
    "title": item.name + (item.lang ? `(${langMap[item.lang]})` : ''),
    "subtitle": "DocSearch",
    "description": `Search ${item.name}${item.lang && '(' + langMap[item.lang] + ')'} documentation`,
    "arguments": [
      {
        "name": "search",
        "placeholder": "Search...",
        "type": "text"
      }
    ],
    "mode": "view"
  }))
}

export default function generatePackageEntry() {
  packageData.commands = generateCommand()

  fs.writeFileSync('./package.json', JSON.stringify(packageData))
}

generatePackageEntry()
