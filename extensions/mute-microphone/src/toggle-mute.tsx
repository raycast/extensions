import { runAppleScript } from "run-applescript";
import {
  Icon,
  LocalStorage,
  Cache,
  MenuBarExtra,
  showHUD,
  launchCommand,
  LaunchType,
  closeMainWindow,
} from "@raycast/api";
import React, { useState } from "react";
import { toggleSystemAudioInputLevel } from "./utils";

export default async function toggleMute() {
  const currentAudioInputLevelString = await runAppleScript("input volume of (get volume settings)");
  const currentAudioInputLevel = isNaN(Number(currentAudioInputLevelString)) ? 0 : Number(currentAudioInputLevelString);
  await toggleSystemAudioInputLevel(currentAudioInputLevel);
  await launchCommand({ name: "mute-menu-bar", type: LaunchType.UserInitiated });
  await closeMainWindow();
}
