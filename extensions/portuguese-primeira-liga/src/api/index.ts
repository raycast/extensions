import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import { find } from "lodash";
import { Newspaper, Preferences, Table } from "../types";
import cheerio from "cheerio";

const footballDataApiKey = getPreferenceValues<Preferences>().apiKey;
const footballDataEndpoint = "https://api.football-data.org/v4";
const headers = {
  "X-Auth-Token": footballDataApiKey,
};

const newspaperWebsiteUrl = "https://24.sapo.pt/jornais/desporto/";
const newspaperIds = ["newspaper-id-4138", "newspaper-id-4137", "newspaper-id-4139"];

function showFailureToast() {
  showToast(Toast.Style.Failure, "Something went wrong", "Please try again later");
}

export const getStandings = async (): Promise<Table[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${footballDataEndpoint}/competitions/PPL/standings`,
    headers,
  };

  try {
    const { data } = await axios(config);
    const totalStandings = find(data.standings, ["type", "TOTAL"]);

    return totalStandings.table;
  } catch (e) {
    showFailureToast();
    return [];
  }
};

export const getNewspapers = async (): Promise<Newspaper[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: newspaperWebsiteUrl,
  };

  try {
    const { data } = await axios(config);
    const html = cheerio.load(data);

    return getNewspapersData(html, newspaperIds);
  } catch (e) {
    showFailureToast();
    return [];
  }
};

function getNewspapersData(html: cheerio.Root, ids: string[]): Newspaper[] {
  return ids.map((id: string) => {
    const title = html(`#${id} picture`).attr("title");
    const cover = html(`#${id} picture`).attr("data-original-src");
    const caption = html(`#${id} picture`).attr("data-caption");
    const captionHtml = cheerio.load(caption || "");
    const url = captionHtml(".newspaper-url").attr("href");

    let name = "";
    if (title) {
      name = title.substring(0, title.indexOf("-"));
    }

    return {
      title: title,
      cover: cover,
      url: url,
      name: name,
    };
  });
}
