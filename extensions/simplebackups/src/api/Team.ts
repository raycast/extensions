import { showToast, Toast, environment } from "@raycast/api";
import fetch from "node-fetch";
import { SB_API_URL } from "../config";
import { requestHeaders } from "../helpers";
import { ITeam } from "../types";

if (environment.isDevelopment) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const Team = {
  async all() {
    const response = await fetch(`${SB_API_URL}/team/list`, {
      method: "get",
      headers: requestHeaders(),
    });

    if (response.status === 401) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unauthorized",
        message: (await response.text()) ?? "Unknown error",
      });
      throw new Error("Error authenticating with SimpleBackups API - invalid API token");
    } else if (response.status < 200 || response.status >= 300) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error retrieving teams",
        message: (await response.text()) ?? "Unknown error",
      });
      throw new Error(`Error fetching teams: ${response.statusText}`);
    }

    const teamData = (await response.json()) as { data: ITeam[] };

    return teamData?.data ?? [];
  },

  async current() {
    const response = await fetch(`${SB_API_URL}/team/current`, {
      method: "get",
      headers: requestHeaders(),
    });

    if (response.status === 401) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unauthorized",
        message: (await response.text()) ?? "Unknown error",
      });
      throw new Error("Error authenticating with SimpleBackups API - invalid API token");
    } else if (response.status < 200 || response.status >= 300) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error retrieving current team",
        message: (await response.text()) ?? "Unknown error",
      });
      throw new Error(`Error fetching current team: ${response.statusText}`);
    }

    const teamData = (await response.json()) as { data: ITeam };

    return teamData?.data ?? [];
  },

  async switch(teamId: number) {
    const response = await fetch(`${SB_API_URL}/team/${teamId}/switch`, {
      method: "patch",
      headers: requestHeaders(),
    });

    if (response.status === 401) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unauthorized",
        message: (await response.text()) ?? "Unknown error",
      });
      throw new Error("Error authenticating with SimpleBackups API - invalid API token");
    } else if (response.status < 200 || response.status >= 300) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error switching teams",
        message: (await response.text()) ?? "Unknown error",
      });
      throw new Error(`Error fetching current team: ${response.statusText}`);
    }
  },
};
