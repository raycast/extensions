import { showHUD } from "@raycast/api";
import { showFailure } from "./lib/errors";
import { runHandy } from "./lib/handy";

export default async function command() {
  try {
    await runHandy("--cancel");
    await showHUD("Handy recording cancelled");
  } catch (error) {
    await showFailure("Could not cancel Handy", error);
  }
}
