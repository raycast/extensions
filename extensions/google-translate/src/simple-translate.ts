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
      proxy: options.proxy,
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
      proxy: options.proxy,
    });

    if (translated1?.langFrom) {
      const translated2 = await simpleTranslate(translated1.translatedText, {
        langFrom: options.langTo[0],
        langTo: [translated1.langFrom],
        proxy: options.proxy,
      });

      return [translated1, translated2];
    }

    return [];
  } else {
    return await Promise.all([
      simpleTranslate(text, {
        langFrom: options.langFrom,
        langTo: options.langTo,
        proxy: options.proxy,
      }),
      simpleTranslate(text, {
        langFrom: options.langTo[0],
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
