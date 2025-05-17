import axios from "axios";
import { SONARR_API_PROFILES, preferences } from "./utils";
import { QualityProfile } from "./types";

export async function loadSonarrProfiles(): Promise<QualityProfile[]> {
  const { SONARR_API_KEY } = preferences;

  try {
    const { data } = await axios.get(SONARR_API_PROFILES, {
      headers: {
        "X-Api-Key": SONARR_API_KEY,
      },
    });
    return data;
  } catch (err) {
    throw new Error("Failed to load Sonarr quality profiles");
  }
}
