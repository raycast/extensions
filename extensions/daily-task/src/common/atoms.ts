import { atom } from "jotai";
import { taskListType } from "./types"
import { getActiveId, getData, saveData, saveActiveId } from './cache'
const data = atom(getData())
const activeId = atom(getActiveId())

const dataAtom = atom(async (get) => {
  return await get(data)
}, async (_get, set, newData: taskListType) => {
  set(data, saveData(newData))
})

const activeIdAtom = atom(async (get) => {
  return await get(activeId)
}, async (_get, set, newData: string) => {
  set(activeId, saveActiveId(newData))
})

export {
  dataAtom,
  activeIdAtom
}