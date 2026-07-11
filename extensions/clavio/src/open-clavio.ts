import { closeMainWindow, open, showHUD } from "@raycast/api";
import { getApplications } from "@raycast/api";

const DOWNLOAD_URL = "https://clavioapp.com/download";

export default async function main() {
  const apps = await getApplications();
  const clavio = apps.find((app) => app.name === "Clavio" || app.bundleId?.toLowerCase().includes("clavio"));

  if (clavio) {
    await closeMainWindow();
    await open(clavio.path);
    await showHUD("Clavio is listening for its summon — hold your key or say the wake word");
  } else {
    await open(DOWNLOAD_URL);
    await showHUD("Clavio isn't installed — opening the download page");
  }
}
