import { atom } from "jotai";
export const maxNumAtom = atom(-1);
export interface Status {
  [key: number]: boolean;
}
export const readStatusAtom = atom<Status>({});
export const totalReadAtom = atom((get) => {
  const readStatus = get(readStatusAtom);
  const numberReadEntries = Object.keys(readStatus).filter((x) => !!readStatus[parseInt(x)]).length;
  return numberReadEntries;
});
export const lastViewedAtom = atom(-1);
export const currentComicAtom = atom(-1);
