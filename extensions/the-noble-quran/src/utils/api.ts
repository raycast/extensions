import axios from "axios";
import { Edition, Surah, Ayah } from "../types";
import { getPreferenceValues } from "@raycast/api";

/**
 * @constant BASE_URL - the base URL for the API
 */
const BASE_URL = "https://api.alquran.cloud/v1";

/**
 * @description - the axios instance for the API with the base URL and headers
 */
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * @function getEdition - get the edition from user configuration
 * @returns {string} - the edition from user configuration
 */
export const getEdition = (): string => {
  return getPreferenceValues<Edition>().edition;
};

/**
 * @function getSurahs - get the surahs from the API
 * @returns {Promise} - the promise of the API call
 */

export const getSurah = async (): Promise<Surah[]> => {
  try {
    const { data } = await api.get(`/surah`);
    return data.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

/**
 * @function getAyahs - get the ayahs from the API
 * @param {number} surahNumber - the surah number
 * @returns {Promise} - the promise of the API call
 */

export const getAyahs = async (surahNumber: number): Promise<Ayah[]> => {
  try {
    const { data } = await api.get(`/surah/${surahNumber}/${getEdition()}`);
    return data.data.ayahs;
  } catch (error) {
    console.error(error);
    return [];
  }
};
