import { open } from "@raycast/api";
import { getAllSites } from "../sites";

type Input = {
  /**
   * The profile to open.
   * @example "@chrismessina"
   * @example "chrismessina"
   *
   * Can or cannot have the @ symbol
   * The only site that uses the @ symbol in the URL is tiktok
   *
   */
  profile: string;
  /**
   * The site to open the profile on.
   * @example "raycast"
   * @example "threads"
   * @example "twitter/x"
   * @example "github"
   * @example "facebook"
   * @example "reddit"
   * @example "youtube"
   * @example "instagram"
   * @example "linkedin"
   * @example "tiktok"
   *
   * twitter and x should lead to x
   * The site must be on the example list
   *
   */
  site: string;
};

const tool = async (input: Input) => {
  const { profile, site } = input;

  const allSites = await getAllSites();
  const enabledSites = allSites.filter((s) => s.value === site);
  const selectedSite = enabledSites.find((s) => s.value === site);
  if (!selectedSite) {
    throw new Error(`Site "${site}" not found or not enabled`);
  }
  const url = selectedSite.urlTemplate.replace("{profile}", profile);

  await open(url);
};

export default tool;
