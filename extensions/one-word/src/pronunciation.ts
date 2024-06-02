import { STORE, STR } from "./constants";
import { fireToast, openPronunciation, safeGetLocalStorage } from "./utils";

export default async () => {
  try {
    const wordEntry = await safeGetLocalStorage<WordEntry>(STORE.WORD_ENTRY);

    if (!wordEntry) {
      await fireToast("Failure", STR.NO_WORD_GENERATED);
      return;
    }

    await openPronunciation(wordEntry);
  } catch (error) {
    await fireToast("Failure", STR.ERROR, error);
  }
};
