import { updateCommandMetadata, showToast, Toast } from "@raycast/api";
import { getProfileFromUserName } from "psn-api";
import { getValidAuthorization } from "./utils/auth";

interface TrophySummary {
  level: number;
  progress: number;
  earnedTrophies: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
}

export default async function Trophy() {
  await showToast({
    style: Toast.Style.Animated,
    title: "Refreshing Trophy...",
  });

  let authorization;
  try {
    authorization = await getValidAuthorization();
  } catch (authError) {
    // Auth errors are handled in the auth utility, just log here
    console.error("Authentication failed:", authError);
    return;
  }

  try {
    const profile = await getProfileFromUserName(authorization, "me");
    if (!profile.profile.trophySummary) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No trophy data found",
        message: "Unable to retrieve trophy information",
      });
      return;
    }

    const trophySummary: TrophySummary = profile.profile.trophySummary;
    const subtitle = `Platinum: ${trophySummary.earnedTrophies.platinum}   Gold: ${trophySummary.earnedTrophies.gold}   Silver: ${trophySummary.earnedTrophies.silver}   Bronze: ${trophySummary.earnedTrophies.bronze}`;
    await updateCommandMetadata({
      subtitle: subtitle,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Refreshed Trophy",
    });
  } catch (profileError) {
    console.error("Error fetching profile data:", profileError);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch trophy data",
      message: "Unable to retrieve your PSN profile. Please try again later.",
    });
  }
}
