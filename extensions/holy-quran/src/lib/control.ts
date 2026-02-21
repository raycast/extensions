import { LocalStorage, launchCommand, LaunchType } from "@raycast/api";
import { stopAudio, pauseAudio, resumeAudio } from "./audio";
import { PlayingInfo } from "../types";

export const GLOBAL_REPEAT_KEY = "global_repeat_enabled";

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
export async function toggleRepeat() {
    const item = await LocalStorage.getItem<string>("currently_playing");
    const globalVal = await LocalStorage.getItem<boolean>(GLOBAL_REPEAT_KEY);

    // Toggle based on current session if active, otherwise toggle the global setting
    const isNowRepeating = item
        ? !(JSON.parse(item) as PlayingInfo).isRepeating
        : !globalVal;

    // Write to the flag file for the background script to pick up
    const fs = require("fs");
    const { REPEAT_FLAG_FILE } = require("./audio");
    fs.writeFileSync(REPEAT_FLAG_FILE, isNowRepeating ? "true" : "false");

    // Save global setting
    await LocalStorage.setItem(GLOBAL_REPEAT_KEY, isNowRepeating);

    let updatedInfo: PlayingInfo | null = null;
    if (item) {
        const playingInfo = JSON.parse(item) as PlayingInfo;
        updatedInfo = {
            ...playingInfo,
            isRepeating: isNowRepeating,
        };
        await LocalStorage.setItem("currently_playing", JSON.stringify(updatedInfo));
    }

    try {
        await launchCommand({ name: "status", type: LaunchType.UserInitiated });
    } catch (e) {
        // ignore
    }

    return updatedInfo || { isRepeating: isNowRepeating } as PlayingInfo;
}
