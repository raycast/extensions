import { translate } from "../vendor/@iamtraction-translate/src";
import * as googleTTS from "google-tts-api";
import * as os from "os";
import * as path from "path";
import * as https from "https";
import * as child_process from "child_process";
import { existsSync, writeFileSync, unlinkSync } from "fs";
import { LanguageCode } from "./languages";
import { LanguageCodeSet } from "./types";
import { HttpsProxyAgent } from "https-proxy-agent";

export const AUTO_DETECT = "auto";

export type SimpleTranslateResult = {
  originalText: string;
  translatedText: string;
  pronunciationText?: string;
  langFrom: LanguageCode;
  langTo: LanguageCode;
  proxy?: string;
};

export class TranslateError extends Error {}

const extractPronounceTextFromRaw = (raw: string) => {
  return raw?.[0]?.[1]?.[2];
};

function isSameLanguage(lang1: string, lang2: string): boolean {
  if (!lang1 || !lang2) return false;
  const l1 = lang1.toLowerCase();
  const l2 = lang2.toLowerCase();
  if (l1 === l2) return true;
  return l1.split("-")[0] === l2.split("-")[0];
}

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

    let targetLang = options.langTo[0];

    if (options.langFrom !== AUTO_DETECT && isSameLanguage(options.langFrom, targetLang) && options.langTo.length > 1) {
      targetLang = options.langTo[1];
    }

    let translated = await translate(text, {
      from: options.langFrom,
      to: targetLang,
      raw: true,
      proxy: options.proxy,
    });

    let detectedLangFrom = translated?.from?.language?.iso as LanguageCode;

    if (options.langFrom === AUTO_DETECT && isSameLanguage(detectedLangFrom, targetLang) && options.langTo.length > 1) {
      targetLang = options.langTo[1];
      translated = await translate(text, {
        from: detectedLangFrom,
        to: targetLang,
        raw: true,
        proxy: options.proxy,
      });
      detectedLangFrom = translated?.from?.language?.iso as LanguageCode;
    }

    return {
      originalText: text,
      translatedText: translated.text,
      pronunciationText: extractPronounceTextFromRaw(translated?.raw),
      langFrom: detectedLangFrom,
      langTo: targetLang,
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

export async function multiTranslate(text: string, options: LanguageCodeSet): Promise<SimpleTranslateResult[]> {
  if (!text) {
    return [];
  }

  const results = await Promise.all(
    options.langTo.map((langTo) =>
      simpleTranslate(text, {
        langFrom: options.langFrom,
        langTo: [langTo],
        proxy: options.proxy,
      }),
    ),
  );

  const validResults = results.filter(Boolean) as SimpleTranslateResult[];

  // Prioritize actual translations (where langFrom !== langTo) over same-language translations
  validResults.sort((a, b) => {
    const aIsSame = isSameLanguage(a.langFrom, a.langTo);
    const bIsSame = isSameLanguage(b.langFrom, b.langTo);
    if (aIsSame && !bIsSame) return 1;
    if (!aIsSame && bIsSame) return -1;
    return 0;
  });

  return validResults;
}

export async function doubleWayTranslate(text: string, options: LanguageCodeSet) {
  if (!text) {
    return [];
  }

  if (options.langFrom === AUTO_DETECT) {
    const translated1 = await simpleTranslate(text, {
      langFrom: options.langFrom,
      langTo: options.langTo,
      proxy: options.proxy,
    });

    if (translated1?.langFrom) {
      const translated2 = await simpleTranslate(translated1.translatedText, {
        langFrom: translated1.langTo,
        langTo: [translated1.langFrom],
        proxy: options.proxy,
      });

      return [translated1, translated2];
    }

    return [];
  } else {
    let targetLang = options.langTo[0];
    if (isSameLanguage(options.langFrom, targetLang) && options.langTo.length > 1) {
      targetLang = options.langTo[1];
    }
    return await Promise.all([
      simpleTranslate(text, {
        langFrom: options.langFrom,
        langTo: [targetLang],
        proxy: options.proxy,
      }),
      simpleTranslate(text, {
        langFrom: targetLang,
        langTo: [options.langFrom],
        proxy: options.proxy,
      }),
    ]);
  }
}

export async function playTTS(text: string, langTo: string, proxy?: string) {
  const audioUrl = googleTTS.getAudioUrl(text, {
    lang: langTo,
    slow: false,
    host: "https://translate.google.com",
  });

  let agent: HttpsProxyAgent<string> | undefined;

  if (proxy) {
    try {
      agent = new HttpsProxyAgent(proxy);
    } catch (e) {
      console.error(`Error creating proxy agent for ${proxy}:`, e);
      agent = undefined; // Fallback to no proxy if agent creation fails
    }
  }

  // The options object for https.get. If 'agent' is undefined, it won't be included,
  // and https.get will use the default agent.
  const requestOptions: https.RequestOptions = {
    agent: agent,
  };

  https.get(audioUrl, requestOptions, (response) => {
    const chunks: Uint8Array[] = [];

    response.on("data", (chunk) => {
      chunks.push(chunk);
    });

    response
      .on("end", () => {
        const audioData = Buffer.concat(chunks);

        const tempFilePath = path.join(os.tmpdir(), "translation.mp3");
        writeFileSync(tempFilePath, audioData);

        // Play the audio file using afplay
        const afplayProcess = child_process.spawn("afplay", [tempFilePath]);

        afplayProcess.on("exit", (code) => {
          if (code !== 0) {
            console.error(`Error playing audio: afplay exited with code ${code}`);
          }
          if (existsSync(tempFilePath)) {
            unlinkSync(tempFilePath);
          }
        });
      })
      .on("error", (error) => {
        console.error("Error downloading audio:", error);
      });
  });
}
