// Create by Peter Zhu

import { closeMainWindow, clearSearchBar, popToRoot, Detail } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default function Command() {
    clearSearchBar();
    closeMainWindow({ clearRootSearch: true });
    popToRoot({ clearSearchBar: true });
    runAppleScript(`
    tell application "Finder" to activate
    tell application "System Events" to keystroke "h" using {command down, option down}
    tell application "Finder" to activate
    tell application "System Events" to keystroke "m" using {command down, option down}
    `);  
}