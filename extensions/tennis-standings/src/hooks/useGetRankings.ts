import { Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect } from "react";
import { API_URL } from "../config/env";
import { Organization } from "../types/organization";
import { Player } from "../types/player";

type GetRankingsOpts = {
  organization: Organization;
  endpoint: "race" | "live-ranking";
};

export const useGetRankings = ({ endpoint, organization }: GetRankingsOpts) => {
  const { data: players, isLoading, error } = useFetch<Player[]>(`${API_URL}/${endpoint}/${organization}`);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  return { players, isLoading };
};
