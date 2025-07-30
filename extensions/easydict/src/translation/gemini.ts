import axios, { AxiosError } from "axios";
import { requestCostTime } from "../axiosConfig";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { AppKeyStore } from "../preferences";
import { GeminiTranslateResult, QueryTypeResult, RequestErrorInfo, TranslationType } from "../types";

interface GeminiErrorResponse {
  error: {
    message: string;
  };
}

/**
 * Gemini translate API using REST request
 */
export async function requestGeminiTranslate(queryWordInfo: QueryWordInfo): Promise<QueryTypeResult> {
  console.log(`---> start request Gemini`);
  const { word, fromLanguage, toLanguage } = queryWordInfo;
  const type = TranslationType.Gemini;
  const apiKey = AppKeyStore.geminiAPIKey;
  const endpoint = AppKeyStore.geminiEndpoint;
  const model = AppKeyStore.geminiModel || "gemini-2.0-flash";

  // Check if API key exists
  if (!apiKey) {
    const errorInfo: RequestErrorInfo = {
      type: type,
      message: "No Gemini API key",
    };
    return Promise.reject(errorInfo);
  }

  // Construct prompt for translation
  const prompt = `Translate the following text from ${fromLanguage} to ${toLanguage}. Only return the translated text without any additional explanation or context:
${word}`;

  const url = `${endpoint}/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const data = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  return new Promise((resolve, reject) => {
    axios
      .post(url, { ...data }, { headers: { "Content-Type": "application/json" } })
      .then((response) => {
        const result = response.data;
        console.log(`---> Gemini translate result: ${JSON.stringify(result)}`);

        if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error("Empty response from Gemini API");
        }

        const translatedText = result.candidates[0].content.parts[0].text.trim();
        console.log(`Gemini translate result: ${translatedText}, cost: ${response.headers[requestCostTime]} ms`);

        const geminiResult: GeminiTranslateResult = {
          translatedText: translatedText,
        };

        const typeResult: QueryTypeResult = {
          type: TranslationType.Gemini,
          result: geminiResult,
          translations: [translatedText],
          queryWordInfo: queryWordInfo,
          oneLineTranslation: translatedText,
        };

        resolve(typeResult);
      })
      .catch((error: AxiosError<GeminiErrorResponse>) => {
        if (error.message === "canceled") {
          console.log(`---> gemini canceled`);
          return reject(undefined);
        }

        console.error("Gemini translate error:", error);
        const errorInfo: RequestErrorInfo = {
          type: type,
          message: error.response?.data?.error?.message || error.message || "Unknown error",
        };
        reject(errorInfo);
      });
  });
}
