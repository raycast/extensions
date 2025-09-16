import { runAppleScript } from "@raycast/api";

export default async function Command() {
  const scriptPath = `${process.cwd()}/scripts/anedot-donor-search.sh`;

  try {
    // Make script executable and run it
    await runAppleScript(`
      do shell script "chmod +x '${scriptPath}'"
      do shell script "'${scriptPath}' '$1'"
    `);
  } catch (error) {
    console.error("Error running script:", error);
  }
}
