import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../config/index";
import { ReaderRequestBody, ReaderResponse } from "./types";
import got from "got";

const readerUrl = "https://readwise.io/api/v3/save/";

const preferences = getPreferenceValues<Preferences>();

const READWISE_API_KEY = preferences.readerApiKey;

export const addToReadwise = async (readerRequestBody: ReaderRequestBody): Promise<ReaderResponse> => {
  const reqBody = {
    body: JSON.stringify(readerRequestBody),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${READWISE_API_KEY}`,
    },
  };

  const res: ReaderResponse = await got.post(readerUrl, reqBody).json();

  return res;
};
