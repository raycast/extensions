import { environment } from "@raycast/api";
import { taskListType } from "./types"
import fs from "fs";

const dataPath = `${environment.supportPath}/tasks.json`
const activePath = `${environment.supportPath}/activeid.txt`
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(dataPath, JSON.stringify([]))
}
if (!fs.existsSync(activePath)) {
  fs.writeFileSync(activePath, '')
}

export function getData() {
  const d = fs.readFileSync(dataPath).toString()
  if (d) {
    return JSON.parse(d)
  } else {
    return []
  }
}
export function getActiveId() {
  const d = fs.readFileSync(activePath).toString()
  return d || ''
}

export function saveData(d: taskListType) {
  fs.writeFileSync(dataPath, JSON.stringify(d))
}
export function saveActiveId(id: string) {
  fs.writeFileSync(activePath, id)
}