import { JotaiAsyncStorage } from "@/utils/jotai-async-storage.util";
import { atomWithStorage } from "jotai/utils";

const sessionTokenStorage = new JotaiAsyncStorage<string>();
export const sessionTokenAtom = atomWithStorage<string>("session-token", "", sessionTokenStorage);

export const setSessionToken = async (sessionToken: string) => {
  await sessionTokenStorage.setItem("session-token", sessionToken);
};

export const getSessionToken = async (): Promise<string> => {
  return await sessionTokenStorage.getItem("session-token", "");
};

export const flushSessionToken = async () => {
  await sessionTokenStorage.removeItem("session-token");
};
