import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { LastBuildStatus } from "../interface/last-build-status";

export const fetchBuildStatus = async (lastBuildId: string): Promise<{ _id: string; status: string } | null> => {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`https://api.codemagic.io/builds/${lastBuildId}`, {
    headers: {
      Authorization: `Bearer ${preferences["codemagic-access-token"]}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const buildData: LastBuildStatus = (await response.json()) as LastBuildStatus;
  return { _id: buildData.build._id, status: buildData.build.status };
};
