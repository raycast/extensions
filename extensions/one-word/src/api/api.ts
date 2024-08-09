import axios from "axios";
import { URL } from "../constants";
import { LanguageCode } from "../types";
import { checkIsLangSupported } from "../utils";

export const API = {
  fetchRandomWord: async (lang?: LanguageCode): Promise<string> => {
    const url = URL.RANDOM_WORD + (checkIsLangSupported(lang) ? `?lang=${lang}` : "");
    const response = await axios.get<string[]>(url);
    return response.data[0];
  },

  fetchTranslation: async (word: string, from: LanguageCode, to: LanguageCode) => {
    const response = await axios.get<string[][][]>(`${URL.TRANSLATE}sl=${from}&tl=${to}&q=${word}`);
    return response.data[0][0][0];
  },
};
