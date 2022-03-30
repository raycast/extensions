import { runAppleScript } from "run-applescript";

export async function checkIfBrowserIsInstalled(): Promise<boolean> {
  return (
    (await runAppleScript(`
      set doesExist to false
      try
        if exists application "Microsoft Edge" then
          set doesExist to true
        end if
      end try
      return doesExist
	`)) === "true"
  );
}
