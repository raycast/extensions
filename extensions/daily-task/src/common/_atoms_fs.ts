import { atom } from "jotai";
import { getActiveId, getData } from './cache'
const dataAtom = atom(getData())
const activeIdAtom = atom(getActiveId())
export {
  dataAtom,
  activeIdAtom
}