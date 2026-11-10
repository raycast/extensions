import { getApplications, open } from "@raycast/api";
import { KEITO_WEB_URL } from "./keito/config";

export async function getKeitoApp() {
  const apps = await getApplications();
  return apps.find((app) => app.name === "Keito");
}

export async function openKeito() {
  const app = await getKeitoApp();
  await open(app?.path ?? KEITO_WEB_URL, app);
}
