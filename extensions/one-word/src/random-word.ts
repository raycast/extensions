import { LaunchProps, LaunchType } from "@raycast/api";
import { STORE, STR } from "./constants";
import { AppConfig, initialAppConfig } from "./hooks/use-config";
import {
  DynamicWordTranslationParams,
  debugLog,
  fireToast,
  getNextExecutionTime,
  safeGetLocalStorage,
  toHHMMSS,
  updateWordEntry,
} from "./utils";

export default async (props: LaunchProps<{ arguments: { customWord?: string } }>) => {
  const {
    arguments: { customWord },
    launchType,
  } = props;

  try {
    const { firstLanguage, secondLanguage, wordInterval } = await safeGetLocalStorage<AppConfig>(
      STORE.CONFIG,
      initialAppConfig,
    );
    debugLog(`------------------ ${launchType} ------------------ \n FL: ${firstLanguage} | SL: ${secondLanguage}`);

    const updateParams: DynamicWordTranslationParams = { from: firstLanguage, to: secondLanguage, customWord };

    if (launchType !== LaunchType.Background) {
      try {
        await updateWordEntry(updateParams);
        await fireToast("Success", STR.SUCCESS);
      } catch (e) {
        if (e instanceof Error && e.message.includes("must be activated")) {
          await fireToast("Failure", STR.MENU_WARNING, e);
        } else {
          await fireToast("Failure", STR.ERROR, e);
        }
      }

      return;
    }

    const wordEntry = await safeGetLocalStorage<WordEntry>(STORE.WORD_ENTRY);
    if (!wordEntry) return debugLog("🛑  No Cached Word Entry");

    const nextExecutionTimestamp = getNextExecutionTime(wordInterval, wordEntry.timestamp);
    if (!nextExecutionTimestamp) return debugLog(`🛑 Return. Interval: ${wordInterval}`);

    const isTimeForUpdate = Date.now() >= nextExecutionTimestamp;
    const logPrefix = `[${wordInterval} Interval] ---- Previous Execution: ${toHHMMSS(wordEntry.timestamp)}`;
    const logSuffix = `Next Execution:  ${isTimeForUpdate ? "✅ Now" : "🟨 " + toHHMMSS(nextExecutionTimestamp)}`;
    debugLog(`${logPrefix} ---- ${logSuffix}`);

    isTimeForUpdate && (await updateWordEntry(updateParams));
  } catch (error) {
    console.log("🛑  error:", error);
  }
};
