import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import got from "got";
import {
  AllApplicationResponse,
  AllCategoryResponse,
  AllPresetResponse,
  AllSystemResponse,
  PresetDetailResponse,
  searchSoftwareResponse,
} from "./types.js";

export const allSystem = async () => {
  const url = "https://www.tourboxtech.com/tbmall/preset/allSystem";
  const response = await got
    .post(url, {
      headers: {
        local: "US",
      },
      json: {
        applicationIdList: [],
        categoryIdList: [],
        deviceIdList: [],
        languageIdList: [],
        systemIdList: ["1198349694762356736"],
      },
    })
    .json<AllSystemResponse>();
  return response.result;
};

export const allApplication = async (categoryId: string) => {
  const url = "https://www.tourboxtech.com/tbmall/preset/allApplicationWithPreset";
  const response = await got
    .post(url, {
      json: {
        size: 99,
        page: 1,
        categoryIdList: [categoryId].filter(Boolean),
      },
    })
    .json<AllApplicationResponse>();
  return response.result;
};

export const allCategory = async () => {
  const url = "https://www.tourboxtech.com/tbmall/preset/allCategory";
  const response = await got
    .post(url, {
      headers: {
        local: "US",
      },
      json: {},
    })
    .json<AllCategoryResponse>();
  return response.result;
};

export const allPreset = async (categoryId: string, applicationId: string = "") => {
  const url = "https://www.tourboxtech.com/tbmall/preset/allPreset";
  const response = await got
    .post(url, {
      headers: {
        local: "US",
      },
      json: {
        applicationIdList: [applicationId].filter(Boolean),
        categoryIdList: [categoryId].filter(Boolean),
        code: "",
        deviceIdList: [],
        languageIdList: [],
        systemIdList: [],
        page: 1,
        size: 99999,
        sortType: "downloadDesc",
      },
    })
    .json<AllPresetResponse>();
  return response.result.records;
};

export const presetDetail = async (presetId: string) => {
  const url = `https://www.tourboxtech.com/tbmall/preset/presetDetail/${presetId}`;
  const response = await got.post(url).json<PresetDetailResponse>();
  return response.result;
};

export const searchSoftware = async (searchString: string) => {
  const url = "https://www.tourboxtech.com/tbmall/preset/queryPreset";
  const response = await got
    .post(url, {
      json: {
        code: searchString,
      },
    })
    .json<searchSoftwareResponse>();
  return response.result;
};

export const downloadPreset = async (url: string) => {
  const file = await got(url).buffer();
  const destination = path.join(os.homedir(), "Downloads", path.basename(url));
  await fs.writeFile(destination, file);
  return destination;
};
