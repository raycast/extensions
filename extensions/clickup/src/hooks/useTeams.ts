import { useEffect, useState } from "react";
import { showToast, ToastStyle } from "@raycast/api";
import type { TeamItem, TeamsResponse } from "../types/teams.dt";
import { ClickUpClient } from "../utils/clickUpClient";

function useTeams() {
  const [teams, setTeams] = useState<TeamItem[] | undefined>(undefined);

  useEffect(() => {
    async function getTeams() {
      try {
        const response = await ClickUpClient<TeamsResponse>("/team", "GET");
        setTeams(response.data?.teams ?? []);
      } catch (error: any) {
        setTeams([]);
        error?.response?.data
          ? await showToast(
              ToastStyle.Failure,
              "Something went wrong",
              `${error?.response?.data?.err} - ${error?.response?.data?.ECODE}`
            )
          : await showToast(ToastStyle.Failure, "Something went wrong");
      }
    }

    getTeams().then((r) => r);
  }, []);

  return teams;
}

export { useTeams };
