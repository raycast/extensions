import { openUrl } from "./helpers";

export default async function command() {
  await openUrl("https://github.com/GliteTech/glite", "Opened Glite Repo");
}
