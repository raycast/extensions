import { runAppleScript } from "@raycast/utils";

export async function checkCli() {
  const exist = await runAppleScript(`
  set x to do shell script "
  if [ -x /opt/homebrew/bin/nowplaying-cli ]; then
      echo exists
  else
      echo does not exist
  fi"
  return x
`);
  if (exist === "exists") {
    return true;
  }
  return false;
}
