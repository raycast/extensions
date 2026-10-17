import { showHUD } from "@raycast/api";
import { showFailure } from "./lib/errors";
import { runHandy } from "./lib/handy";

export default async function command() {
  try {
    await runHandy("--toggle-transcription");
    await showHUD("Handy recording toggled 🎙️");
  } catch (error) {
    await showFailure("Could not control Handy", error);
  }
}
