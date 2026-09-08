import { confirmRecentImport, populateRecentFiles } from "./lib/recent-setup";

export default async function Command() {
  if (await confirmRecentImport()) await populateRecentFiles();
}
