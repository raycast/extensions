import { atom, useAtom, useSetAtom, useAtomValue } from "jotai";

const isLoadingAtom = atom<boolean>(false);
export const useIsLoadingAtom = () => useAtom(isLoadingAtom);

const isErrorCodeAtom = atom<number | undefined>(undefined);
export const useIsErrorCodeWrite = () => useSetAtom(isErrorCodeAtom);
export const useIsErrorCodeValue = () => useAtomValue(isErrorCodeAtom);
