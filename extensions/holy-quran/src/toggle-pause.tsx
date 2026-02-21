import { showHUD } from "@raycast/api";
import { togglePause } from "./lib/control";

export default async function Command() {
    try {
        const updated = await togglePause();
        if (!updated) {
            await showHUD("No Recitation Playing");
            return;
        }

        await showHUD(updated.isPaused ? "Paused" : "Resumed");
    } catch (error) {
        await showHUD("Failed to toggle pause");
    }
}
