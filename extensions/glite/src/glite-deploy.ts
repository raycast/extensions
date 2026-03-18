import { openUrl } from "./helpers";

export default async function command() {
  await openUrl(
    "https://github.com/GliteTech/glite/actions/workflows/deploy_backend.yml",
    "Opened Glite Deploy",
  );
}
