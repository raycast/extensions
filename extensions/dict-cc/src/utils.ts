import * as fs from "fs";
import * as https from "https";
import * as tmp from "tmp";
import * as sound from "sound-play";

import { Languages } from "dictcc";
import { TranslationInput } from "dictcc";

import { getPreferences, supportedLanguages } from "./preferences";

const TEMP_FILE_PATH = tmp.tmpNameSync({ postfix: "mp3" });

export const getListSubtitle = (loading: boolean, languages: [Languages, Languages] | undefined, totalCount = 0) => {
  const lang1 = supportedLanguages.find((l) => l.value === languages?.[0]);
  const lang2 = supportedLanguages.find((l) => l.value === languages?.[1]);

  return loading
    ? "Loading..."
    : `${lang1?.title} ${lang1?.flag} -> ${lang2?.title} ${lang2?.flag} | ${totalCount.toString()} results`;
};

export const joinStringsWithDelimiter: (values: (string | null | undefined)[], delimiter?: string) => string = (
  values,
  delimiter = ", ",
): string => (values ? values.filter(Boolean).join(delimiter) : "");

export const getLanguage = (text: string) =>
  Object.values<string>(Languages).includes(text) ? Languages[text as Languages] : undefined;

export const createInputFromSearchTerm = (searchTerm: string): TranslationInput => {
  let term = searchTerm;

  let { sourceLanguage, targetLanguage } = getPreferences();

  // e.g. 'en de Home' => ["en", "de", "Home"], lang1 = "en", lang2 = "de", term = ".*"
  const split = term.trim().split(" ");
  if (split.length > 2) {
    const lang1 = getLanguage(split[0]);
    const lang2 = getLanguage(split[1]);

    if (lang1 && lang2) {
      sourceLanguage = lang1;
      targetLanguage = lang2;
      term = term.split(`${sourceLanguage} ${targetLanguage}`)[1];
    }
  }

  return {
    sourceLanguage,
    targetLanguage,
    term,
  };
};

export const playAudio = (url: string) => {
  https.get(url, (response) => {
    const writeStream = fs.createWriteStream(TEMP_FILE_PATH);

    response.pipe(writeStream);

    writeStream.on("finish", () => {
      sound.play(TEMP_FILE_PATH);
      tmp.setGracefulCleanup();
    });
  });
};
