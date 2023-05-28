import { LocalStorage } from "@raycast/api";
import { taskListType } from "./types"

export async function getData() {
  const d = await LocalStorage.getItem<string>('data')
  let data: taskListType = []
  if (d != undefined) {
    data = JSON.parse(d)
  }
  return data
}
export async function getActiveId() {
  const d = await LocalStorage.getItem<string>('activeId')
  return d || ''
}

export async function saveData(d: taskListType) {
  await LocalStorage.setItem('data', JSON.stringify(d))
  return d
}
export async function saveActiveId(id: string) {
  await LocalStorage.setItem('activeId', id)
  return id
}