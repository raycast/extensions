import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import bplist from "bplist-parser";
import { defaultRate } from "./constants.js";
import type { SpeechPlist } from "./types.js";

export const getSpeechPlist = async (): Promise<SpeechPlist | undefined> => {
  if (process.platform !== "darwin") return undefined;

  try {
    const speechPlistPath = path.join(os.homedir(), "Library/Preferences/com.apple.speech.voice.prefs.plist");
    const speechPlistFile = await fs.readFile(speechPlistPath);
    const [settings] = bplist.parseBuffer(speechPlistFile);
    const foundRate = settings?.VoiceRateDataArray?.find(
      ([, voiceId]: number[]) => voiceId === settings.SelectedVoiceID,
    );

    return { voice: settings?.SelectedVoiceName, rate: foundRate?.[2] } as SpeechPlist;
  } catch {
    return undefined;
  }
};

export const getSystemSpeakingRate = async (): Promise<number> => {
  const rate = (await getSpeechPlist())?.rate;
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : defaultRate;
};
