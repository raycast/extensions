import { atomWithStorage } from "jotai/utils";
import { JotaiAsyncStorage } from "../utils/jotai-async-storage.util";

const loggingEmailStorage = new JotaiAsyncStorage<string>();
const loggingTokenSentStorage = new JotaiAsyncStorage<boolean>();

export const loggingEmailAtom = atomWithStorage<string>("logging-email", "", loggingEmailStorage);
export const loggingTokenSentAtom = atomWithStorage<boolean>("logging-token-sent", false, loggingTokenSentStorage);
