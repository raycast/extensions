import { LocalStorage, launchCommand, LaunchType } from "@raycast/api";
import { stopAudio, pauseAudio, resumeAudio } from "./audio";
import { PlayingInfo } from "../types";

export async function stopPlayback() {
    await stopAudio();
    await LocalStorage.removeItem("currently_playing");
    // Refresh Menu Bar status
    try {
        await launchCommand({ name: "status", type: LaunchType.UserInitiated });
    } catch (e) {
        // Menu bar might not be active, ignore
    }
}

export async function togglePause() {
    const item = await LocalStorage.getItem<string>("currently_playing");
    if (!item) return null;

    const playingInfo = JSON.parse(item) as PlayingInfo;
    const now = Date.now();
    let updatedInfo: PlayingInfo;

    if (playingInfo.isPaused) {
        await resumeAudio();
        const pauseDuration = now - (playingInfo.lastPausedAt || now);
        updatedInfo = {
            ...playingInfo,
            isPaused: false,
            pausedTime: (playingInfo.pausedTime || 0) + pauseDuration,
            lastPausedAt: undefined,
        };
    } else {
        await pauseAudio();
        updatedInfo = {
            ...playingInfo,
            isPaused: true,
            lastPausedAt: now,
        };
    }

    await LocalStorage.setItem("currently_playing", JSON.stringify(updatedInfo));

    // Refresh Menu Bar status
    try {
        await launchCommand({ name: "status", type: LaunchType.UserInitiated });
    } catch (e) {
        // Menu bar might not be active, ignore
    }

    return updatedInfo;
}
