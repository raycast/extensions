import { showToast, Toast, open } from "@raycast/api";
import { getAllSites } from "./sites";

export default async function command(props: { arguments: { profile: string; site: string } }) {
  const { profile, site } = props.arguments;

  try {
    const allSites = await getAllSites();
    const enabledSites = allSites.filter((s) => s.value === site);
    const selectedSite = enabledSites.find((s) => s.value === site);
    if (!selectedSite) {
      throw new Error(`Site "${site}" not found or not enabled`);
    }
    const url = selectedSite.urlTemplate.replace("{profile}", profile);
    await open(url);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open profile",
      message: (error as Error).message,
    });
  }
}
