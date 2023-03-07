import { closeMainWindow, showHUD } from "@raycast/api";
import isUrl from "is-url";
import { makeNewLittleArcWindow } from "./arc";
import { newTabPreferences } from "./preferences";

export default async function command() {
    try {
        const newTabUrl = newTabPreferences.url;
        if (!isUrl(newTabUrl)) {
            throw new Error("Invalid URL defined in preferences");
        }

        await closeMainWindow();
        await makeNewLittleArcWindow(newTabUrl);
    } catch (e) {
        console.error(e);

        await showHUD("❌ Failed opening a new little arc window.");
    }
}
