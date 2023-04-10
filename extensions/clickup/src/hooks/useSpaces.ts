import { useEffect, useState } from "react";
import { showToast, ToastStyle } from "@raycast/api";
import type { SpaceItem, SpacesResponse } from "../types/spaces.dt";
import { ClickUpClient } from "../utils/clickUpClient";

function useSpaces(teamId: string) {
  const [spaces, setSpaces] = useState<SpaceItem[] | undefined>(undefined);

  useEffect(() => {
    async function getTeams() {
      try {
        const response = await ClickUpClient<SpacesResponse>(`/team/${teamId}/space?archived=false`);
        setSpaces(response.data?.spaces ?? []);
      } catch (error: any) {
        setSpaces([]);
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
  }, [teamId]);

  return spaces;
}

export { useSpaces };
