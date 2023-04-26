import {closeMainWindow, showHUD} from "@raycast/api";
import {exec} from "child_process";
import {promisify} from "util";

const execPromise = promisify(exec);

export default async function main() {
    closeMainWindow().then();
    try {
        await execPromise(`osascript -e 'tell app "System Events" to tell appearance preferences to set dark mode to not dark mode'`);

        await execPromise("defaults read -g AppleInterfaceStyle")
            // If dark mode is enabled, the command will return “Dark”.
            .then((result) => {
                showHUD("Dark mode is now enabled.");
            })
            // If dark mode is disabled, the command will return “The domain/default pair of (kCFPreferencesAnyApplication,
            //   AppleInterfaceStyle) does not exist” with exit code 1.
            .catch(() => {
                showHUD("Dark mode is now disabled.");
            });
    } catch (error) {
        console.error(error);
        await showHUD("An error occurred while changing dark mode status.");
    }
}