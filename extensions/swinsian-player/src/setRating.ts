import { showHUD, LaunchProps } from "@raycast/api";
import { setRating, getPlayerStatus } from "./helpers/swinsian";

interface Args {
  rating: string;
}

export default async function SetRating(props: LaunchProps<{ arguments: Args }>) {
  const raw = parseInt(props.arguments.rating);
  if (isNaN(raw) || raw < 0 || raw > 5) {
    await showHUD("Please enter a rating between 0 and 5");
    return;
  }

  const status = await getPlayerStatus();
  if (!status.track) {
    await showHUD("Nothing is playing");
    return;
  }

  await setRating(raw);
  const stars = "★".repeat(raw) + "☆".repeat(5 - raw);
  await showHUD(raw === 0 ? "Rating cleared" : `Rated ${raw} star${raw > 1 ? "s" : ""} ${stars}`);
}
