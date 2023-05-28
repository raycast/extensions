import { LocalStorage } from "@raycast/api";
import { taskListType } from "./types"

export async function getData() {
  const d = await LocalStorage.getItem<string>('data')
  if (d == undefined) {
    return []
  } else {
    return JSON.parse(d)
  }
}
export async function getActiveId() {
  const d = await LocalStorage.getItem<string>('activeId')
  return d || ''
}

export async function saveData(d: taskListType) {
  await LocalStorage.setItem('data', JSON.stringify(d))
}
export async function saveActiveId(id:string) {
  await LocalStorage.setItem('activeId', id)
}