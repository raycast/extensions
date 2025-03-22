/* eslint no-useless-escape: 0 */

import { runAppleScript } from "run-applescript";
import { TVC_APP_NAME } from "./constants";
import { TVCLogger } from "./logger";

const context = "src/check-installation.ts";

/**
 * Checks if TradingView is installed.
 * @returns true if TradingView is installed, false otherwise
 */
export async function checkInstallation(): Promise<boolean> {
  TVCLogger.info("Checking if TradingView is installed...", { context });
  const output = await runAppleScript(`
    set doesExist to false
    try
        do shell script "osascript -e 'id of application \\\"${TVC_APP_NAME}\\\"'"
        set doesExist to true
    end try

    return doesExist
  `);
  TVCLogger.info(`${TVC_APP_NAME} is installed: ${output}`, { context });
  return JSON.parse(output) as boolean;
}
