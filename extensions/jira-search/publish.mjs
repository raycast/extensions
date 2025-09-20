import fs from "fs"
import path from "path"

const target = path.join("..", "extensions-jira-search", "extensions", "jira-search")
const ignoreList = [".git", ".idea", "node_modules"]
const shouldIgnore = (item) => ignoreList.findIndex((ignoreItem) => item === ignoreItem) > -1
function copy(item) {
  const copyFile = () => {
    console.log(`copying file ${item}`)
    fs.copyFileSync(item, path.join(target, item))
  }
  const copyDir = () => {
    console.log(`copying directory ${item}`)
    fs.cpSync(item, path.join(target, item), { recursive: true })
  }
  if (fs.statSync(item).isDirectory()) copyDir()
  else if (fs.statSync(item).isFile()) copyFile()
  else console.warn(`ignored item ${item}`)
}

// prepare target directory
if (fs.existsSync(target)) {
  console.log(`cleaning target directory ${target}`)
  fs.rmSync(target, { force: true, recursive: true })
}
console.log(`creating target directory ${target}`)
fs.mkdirSync(target)

// copy items
const items = fs.readdirSync(".").filter((item) => !shouldIgnore(item))
items.forEach((item) => copy(item))
