import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

export function codeGenerateApi(prompt: string) {
  const { language, apikey, apisecret } = getPreferenceValues();
  return axios({
    method: "post",
    url: "https://wudao.aminer.cn/os/api/api/v2/multilingual_code/generate",
    data: {
      lang: language,
      n: 1,
      prompt,
      apikey,
      apisecret,
    },
  });
}
interface CodeGenerateFormApiParams {
  prompt: string;
  lang: string;
}
export function codeGenerateFormApi({ prompt, lang }: CodeGenerateFormApiParams) {
  const { apikey, apisecret } = getPreferenceValues();
  return axios({
    method: "post",
    url: "https://wudao.aminer.cn/os/api/api/v2/multilingual_code/generate",
    data: {
      lang,
      n: 1,
      prompt,
      apikey,
      apisecret,
    },
  });
}
export function codeExplainApi(prompt: string) {
  const { language, comment, apikey, apisecret } = getPreferenceValues();
  return axios({
    method: "post",
    url: "https://wudao.aminer.cn/os/api/api/v2/multilingual_code/explain",
    data: {
      n: 1,
      prompt,
      lang: language,
      locale: comment,
      apikey,
      apisecret,
    },
  });
}
interface CodeExplainFormApiParams {
  prompt: string;
  lang: string;
  locale: string;
}
export function codeExplainFormApi({ prompt, lang, locale }: CodeExplainFormApiParams) {
  const { apikey, apisecret } = getPreferenceValues();
  return axios({
    method: "post",
    url: "https://wudao.aminer.cn/os/api/api/v2/multilingual_code/explain",
    data: {
      n: 1,
      prompt,
      lang,
      locale,
      apikey,
      apisecret,
    },
  });
}
export function codeTranslateApi(prompt: string) {
  const { language, targetLanguage, apikey, apisecret } = getPreferenceValues();
  const src_lang = language === "Javascript" ? "JavaScript" : language;
  return axios({
    method: "post",
    url: "https://wudao.aminer.cn/os/api/api/v2/multilingual_code/translate",
    data: {
      dst_lang: targetLanguage,
      n: 1,
      prompt,
      src_lang,
      stop: [],
      apikey,
      apisecret,
    },
  });
}
interface CodeTranslateFormApiParams {
  prompt: string;
  source: string;
  target: string;
}
export function codeTranslateFormApi({ prompt, source, target }: CodeTranslateFormApiParams) {
  const { apikey, apisecret } = getPreferenceValues();
  return axios({
    method: "post",
    url: "https://wudao.aminer.cn/os/api/api/v2/multilingual_code/translate",
    data: {
      dst_lang: target,
      n: 1,
      prompt,
      src_lang: source,
      stop: [],
      apikey,
      apisecret,
    },
  });
}
