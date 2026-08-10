import { getPreferenceValues } from "@raycast/api";
import { errorUtils } from "./errors.utils";

const getPreference = (key: keyof Preferences): string => {
  const { throwError, CONSTANTS } = errorUtils;
  try {
    return getPreferenceValues<Preferences>()[key];
  } catch (error) {
    throwError(CONSTANTS.noPreferenceKey);
    return "";
  }
};

const getDefaultSlowedSpeed = () => getPreference("defaultSlowedSpeed") || "0.8";
const getDefaultNightcoreSpeed = () => getPreference("defaultNightcoreSpeed") || "1.2";

const getAllDefaultSpeeds = () => ({
  slowed: getDefaultSlowedSpeed(),
  nightcore: getDefaultNightcoreSpeed(),
});

export const preferenceUtils = {
  getPreference,
  getDefaultSlowedSpeed,
  getDefaultNightcoreSpeed,
  getAllDefaultSpeeds,
};
