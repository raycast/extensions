import { closeMainWindow, getApplications, open, showHUD } from "@raycast/api";

const DOWNLOAD_URL = "https://clavioapp.com/download";
const CLAVIO_BUNDLE_ID = "justetools.co.uk.ClavioMac";

export default async function main() {
  const apps = await getApplications();
  const clavio = apps.find((app) => app.bundleId === CLAVIO_BUNDLE_ID);

  if (clavio) {
    await closeMainWindow();
    await open(clavio.path);
    await showHUD("Clavio is listening for its summon — hold your key or say the wake word");
  } else {
    await open(DOWNLOAD_URL);
    await showHUD("Clavio isn't installed — opening the download page");
  }
}
