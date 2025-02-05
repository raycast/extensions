import translate from "@iamtraction/google-translate";
import * as googleTTS from "google-tts-api";
import * as os from "os";
import * as path from "path";
import * as https from "https";
import * as child_process from "child_process";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { LanguageCode } from "./languages";
import { LanguageCodeSet } from "./types";

export const AUTO_DETECT = "auto";

export type SimpleTranslateResult = {
  originalText: string;
  translatedText: string;
  pronunciationText?: string;
  langFrom: LanguageCode;
  langTo: LanguageCode;
};

export class TranslateError extends Error {}

const extractPronounceTextFromRaw = (raw: string) => {
  return raw?.[0]?.[1]?.[2];
};

export async function simpleTranslate(text: string, options: LanguageCodeSet): Promise<SimpleTranslateResult> {
  try {
    if (!text) {
      return {
        originalText: text,
        translatedText: "",
        pronunciationText: "",
        langFrom: options.langFrom,
        langTo: options.langTo[0],
      };
    }

    const translated = await translate(text, {
      from: options.langFrom,
      to: options.langTo[0],
      raw: true,
    });

    return {
      originalText: text,
      translatedText: translated.text,
      pronunciationText: extractPronounceTextFromRaw(translated?.raw),
      langFrom: translated?.from?.language?.iso as LanguageCode,
      langTo: options.langTo[0],
    };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "TooManyRequestsError") {
        const error = new TranslateError();
        error.name = "Too many requests";
        error.message = "please try again later";
        throw error;
      }

      const error = new TranslateError();
      error.name = err.name;
      error.message = err.message;
      throw error;
    }

    throw err;
  }
}

export async function doubleWayTranslate(text: string, options: LanguageCodeSet) {
  if (!text) {
    return [];
  }

  if (options.langFrom === AUTO_DETECT) {
    const translated1 = await simpleTranslate(text, {
      langFrom: options.langFrom,
      langTo: options.langTo,
    });

    if (translated1?.langFrom) {
      const translated2 = await simpleTranslate(translated1.translatedText, {
        langFrom: options.langTo[0],
        langTo: [translated1.langFrom],
      });

      return [translated1, translated2];
    }

    return [];
  } else {
    return await Promise.all([
      simpleTranslate(text, {
        langFrom: options.langFrom,
        langTo: options.langTo,
      }),
      simpleTranslate(text, {
        langFrom: options.langTo[0],
        langTo: [options.langFrom],
      }),
    ]);
  }
}

export async function playTTS(text: string, langTo: string) {
  const audioUrl = googleTTS.getAudioUrl(text, {
    lang: langTo,
    slow: false,
    host: "https://translate.google.com",
  });
  https.get(audioUrl, (response) => {
    const chunks: Uint8Array[] = [];

    response.on("data", (chunk) => {
      chunks.push(chunk);
    });

    response.on("end", () => {
      const audioData = Buffer.concat(chunks);

      const tempFilePath = path.join(os.tmpdir(), "translation.mp3");
      writeFileSync(tempFilePath, audioData);

      // Play the audio file using afplay
      const afplayProcess = child_process.spawn("afplay", [tempFilePath]);

      afplayProcess.on("exit", (code) => {
        if (code !== 0) {
          console.error("Error playing audio");
        }
        if (existsSync(tempFilePath)) {
          unlinkSync(tempFilePath);
        }
      });
    });
  });
}
