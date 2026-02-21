import { showHUD } from "@raycast/api";
import { toggleRepeat } from "./lib/control";

export default async function Command() {
    try {
        const updated = await toggleRepeat();
        if (!updated) {
            await showHUD("No Recitation Playing");
            return;
        }

        await showHUD(updated.isRepeating ? "Repeat: ON" : "Repeat: OFF");
    } catch (error) {
        await showHUD("Failed to toggle repeat");
    }
}
