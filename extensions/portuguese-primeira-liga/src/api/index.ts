import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import { find } from "lodash";
import { Newspaper, Preferences, Table, TopScorer } from "../types";
import cheerio from "cheerio";

const footballDataApiKey = getPreferenceValues<Preferences>().apiKey;
const footballDataEndpoint = "https://api.football-data.org/v4";
const headers = {
  "X-Auth-Token": footballDataApiKey,
};

const newspaperWebsiteUrl = "https://sapo.pt/noticias/jornais/desporto/";
const newspaperIds = ["doc-8679e74e9c7f9d3f03000000", "doc-8679e74e9c7f9d3f6c000000", "doc-fb79e74ed9660e366e000000"];

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
    // Get the newspaper name from the h3 heading
    const title = html(`#${id} .details h3 a`).text().trim();

    // Get the cover image from the trigger link href
    const cover = html(`#${id} a.trigger`).attr("href");

    // Get the URL from the h3 link
    const url = html(`#${id} .details h3 a`).attr("href");

    // Use the title as the name, or extract from title if needed
    let name = title;
    if (title && title.includes("-")) {
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

export const getTopScorers = async (): Promise<TopScorer[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${footballDataEndpoint}/competitions/PPL/scorers`,
    headers,
  };

  try {
    const { data } = await axios(config);

    return data.scorers;
  } catch (e) {
    showFailureToast();
    return [];
  }
};
