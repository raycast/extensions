import { showHUD } from "@raycast/api";
import { showFailure } from "./lib/errors";
import { runHandy } from "./lib/handy";

export default async function command() {
  try {
    await runHandy("--toggle-post-process");
    await showHUD("Post-processed recording toggled ✨");
  } catch (error) {
    await showFailure("Could not control Handy", error);
  }
}
