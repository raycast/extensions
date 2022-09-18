import fetch from "node-fetch";
import { Prediction } from "../types";
import { temporaryFile } from "tempy";
import fs from "fs";
import { getPreferenceValues, openCommandPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { PREDICTIONS_URL } from "../constants";

export const buildPredictionsList = (data?: Prediction[]) => {
  if (!data) return undefined;
  const predictions: Prediction[] = [];
  // iterate over the URLs and if more than one is returned, clone it back in
  data
    ?.filter(succeeded)
    ?.filter(filterIsUrl)
    ?.forEach((prediction) => {
      prediction?.output?.forEach((url, index) => {
        predictions.push({
          ...prediction,
          output: [url],
          id: `${prediction.id}-${index}`,
        });
      });
    });
  return predictions;
};

export const succeeded = (prediction: Prediction) => prediction.status === "succeeded";
export const filterIsUrl = (prediction: Prediction) => {
  try {
    prediction?.output.forEach((url) => new URL(url));
    return true;
  } catch (e) {
    return false;
  }
};
export const makeTitle = (str: string) =>
  str.replace(/_/g, " ").replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

export const copyImage = async (url: string) => {
  const tempFile = temporaryFile({ extension: "png" });
  const { hide } = await showToast(Toast.Style.Animated, "Copying image...");
  const response = await fetch(url);

  if (response.status !== 200) {
    await showHUD(`❗Image copy failed. Server responded with ${response.status}`);
    hide();
    return;
  }
  if (response.body !== null) {
    response.body.pipe(fs.createWriteStream(tempFile));
    await runAppleScript(`tell app "Finder" to set the clipboard to ( POSIX file "${tempFile}" )`);
    await showHUD("✅ Image copied to clipboard!");
    hide();
  }
};

export const buildPaginatedUrl = (cursor: string | undefined) => {
  const { token } = getPreferenceValues();
  const headers = { Authorization: `Token ${token}` };
  const apiEndpoint = new URL(PREDICTIONS_URL);
  if (cursor) apiEndpoint.searchParams.set("cursor", cursor);
  return { apiEndpoint, headers };
};

export const showAuthError = (title?: string, message?: string) => {
  showToast({
    title: message ?? "",
    style: Toast.Style.Failure,
    primaryAction: {
      title: "Update token",
      onAction: openCommandPreferences,
    },
  });
};
