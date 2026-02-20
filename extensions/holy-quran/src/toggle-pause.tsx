import { showToast, Toast } from "@raycast/api";
import { togglePause } from "./lib/control";

export default async function Command() {
    try {
        const updated = await togglePause();
        if (!updated) {
            await showToast({
                style: Toast.Style.Failure,
                title: "No Recitation Playing",
                message: "Start a Surah to use pause/resume.",
            });
            return;
        }

        await showToast({
            style: Toast.Style.Success,
            title: updated.isPaused ? "Paused" : "Resumed",
            message: updated.surah,
        });
    } catch (error) {
        await showToast({
            style: Toast.Style.Failure,
            title: "Action failed",
            message: error instanceof Error ? error.message : String(error),
        });
    }
}
