import preference from "./shortcut";

export const requestOptions = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": preference.apiKey,
  },
};
