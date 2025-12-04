import { getPreferenceValues } from "@raycast/api";

export const octoPrintBaseUrl = getPreferenceValues().octoPrintBaseUrl;

const APIKEY = getPreferenceValues().applicationKey;

export const ENDPOINTS = {
  jobStatus: `${octoPrintBaseUrl}/api/job`,
  printerStatus: `${octoPrintBaseUrl}/api/printer`,
  getAllFiles: `${octoPrintBaseUrl}/api/files?recursive=true`,
  setToolTemp: `${octoPrintBaseUrl}/api/printer/tool`,
  setBedTemp: `${octoPrintBaseUrl}/api/printer/bed`,
};

export const HEADERS = {
  Authorization: `Bearer ${APIKEY}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};
