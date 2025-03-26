import * as fs from "node:fs";
import { Result } from "../types";

export function createResultFromAppleScriptError(error: unknown, defaultMessage: string): Result<never> {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for Bartender not installed error (-2741 is the AppleScript error code)
  if (errorMessage.includes("-2741") || errorMessage.includes("Application isn't running")) {
    return {
      status: "error",
      error:
        "Bartender must be installed and running to use this command. You may install it from https://macbartender.com or Setapp.",
    };
  }
  return {
    status: "error",
    error: error instanceof Error ? error.message : defaultMessage,
  };
}

export function getTellApplication() {
  const setappPaths = ["/Applications/Setapp/Bartender.app", "~/Applications/Setapp/Bartender.app"];
  for (const path of setappPaths) {
    if (fs.existsSync(path)) {
      return `tell application "Bartender"`;
    }
  }
  return `tell application "Bartender 5"`;
}
