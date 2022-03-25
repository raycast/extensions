import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { showToast, Toast } from "@raycast/api";
import { PremierLeague, Table } from "../types/table";
import { Content, Fixture } from "../types/fixture";
import { seasons } from "../components/season_dropdown";
import { clubs } from "../components/club_dropdown";

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
    url: `https://footballapi.pulselive.com/football/standings`,
    params: {
      compSeasons: seasonId,
      altIds: true,
      detail: 2,
      FOOTBALL_COMPETITION: 1,
    },
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

export const getFixtures = async (
  clubId: string,
  page: number,
  sort: string,
  statuses: string
): Promise<Content[]> => {
  const teams = clubId === "-1" ? clubs.map((c) => c.value).join() : clubId;

  const config: AxiosRequestConfig = {
    method: "get",
    url: `https://footballapi.pulselive.com/football/fixtures`,
    params: {
      comps: 1,
      teams,
      compSeasons: seasons[0].value,
      page,
      pageSize: 40,
      sort,
      statuses,
      altIds: true,
    },
    headers: {
      Origin: "https://www.premierleague.com",
    },
  };

  try {
    const { data }: AxiosResponse<Fixture> = await axios(config);

    return data.content;
  } catch (e) {
    showFailureToast();

    return [];
  }
};
