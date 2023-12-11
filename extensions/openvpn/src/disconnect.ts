import { runAppleScript } from "run-applescript";
import { closeMainWindow } from "@raycast/api";
import { isRunning } from './utils';

export default async function Command() {
    await closeMainWindow();
    const isOpenVPNRunning = await isRunning();
    if (!isOpenVPNRunning) {
        return;
    }
    await runAppleScript(`
        tell application "System Events" to tell process "OpenVPN Connect" to tell menu bar item 1 of menu bar 2
            click
            get menu items of menu 1
            try
                click menu item "Disconnect" of menu 1
                on error --menu item toggles between connect/disconnect
                key code 53 --escape key to close menu
            end try
        end tell
    `)
}