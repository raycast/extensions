import { open } from "@raycast/api";
import { getAllSites } from "../sites";
import { showFailureToast } from "@raycast/utils";

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
   * @example "behance"
   * @example "codepen"
   * @example "devto"
   * @example "dribbble"
   * @example "facebook"
   * @example "github"
   * @example "instagram"
   * @example "linkedin"
   * @example "medium"
   * @example "producthunt"
   * @example "raycast"
   * @example "reddit"
   * @example "spotify"
   * @example "threads"
   * @example "tiktok"
   * @example "x"
   * @example "youtube"
   *
   * The site must be on the example list
   *
   */
  site: string;
};

const tool = async (input: Input) => {
  const { profile, site } = input;
  const allSites = await getAllSites();
  const selectedSite = allSites.find((s) => s.value === site);
  if (!selectedSite) {
    showFailureToast(`Site "${site}" not found or not enabled`, { title: "Failed to find site" });
    return;
  }
  const url = selectedSite.urlTemplate.replace("{profile}", profile);
  try {
    await open(url);
  } catch (error) {
    showFailureToast(`Failed to open ${site} profile: ${profile}`, { title: "Failed to open URL" });
  }
};
export default tool;
