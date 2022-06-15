import { preferences, showToast, Toast } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";
import { find } from "lodash";
import { Table } from "../types";

const apiKey = preferences.apiKey?.value as string;

const endpoint = "https://api.football-data.org/v4";
const headers = {
  "X-Auth-Token": apiKey,
};

function showFailureToast() {
  showToast(Toast.Style.Failure, "Something went wrong", "Please try again later");
}

export const getStandings = async (): Promise<Table[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/competitions/PPL/standings`,
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
