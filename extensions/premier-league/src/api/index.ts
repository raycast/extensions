import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { showToast, Toast } from "@raycast/api";
import { PremierLeague, Table } from "../types";

function showFailureToast() {
  showToast(
    Toast.Style.Failure,
    "Something went wrong",
    "Please try again later"
  );
}

export const getTables = async (seasonId: string): Promise<Table[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `https://footballapi.pulselive.com/football/standings?compSeasons=${seasonId}&altIds=true&detail=2&FOOTBALL_COMPETITION=1`,
    headers: {
      Origin: "https://www.premierleague.com",
    },
  };

  try {
    const { data }: AxiosResponse<PremierLeague> = await axios(config);

    return data.tables;
  } catch (e) {
    showFailureToast();

    return [];
  }
};
