import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import got from "got";
import { AllApplicationResponse, AllCategoryResponse, AllPresetResponse, searchSoftwareResponse } from "./types.js";

export const allApplication = async (categoryId: string) => {
  const url = "https://www.tourboxtech.com/tbmall/app/allApplication";
  const response = await got
    .post(url, {
      json: {
        size: 99,
        page: 1,
        categoryId,
      },
    })
    .json<AllApplicationResponse>();
  return response.result;
};

export const allCategory = async () => {
  const url = "https://www.tourboxtech.com/tbmall/app/allCategory";
  const response = await got
    .post(url, {
      headers: {
        local: "US",
      },
      json: {},
    })
    .json<AllCategoryResponse>();
  console.log("response", response);
  return response.result;
};

export const allPreset = async (categoryId: string, applicationId: string = "") => {
  const url = "https://www.tourboxtech.com/tbmall/app/allPreset";
  const response = await got
    .post(url, {
      json: {
        applicationId,
        categoryId,
        isRecommend: "",
        languageId: "",
        page: 1,
        size: 99999,
        sort: "desc",
        sortType: "download",
      },
    })
    .json<AllPresetResponse>();
  return response.result.records;
};

export const searchSoftware = async (searchString: string) => {
  const url = "https://www.tourboxtech.com/tbmall/app/queryPreset";
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
