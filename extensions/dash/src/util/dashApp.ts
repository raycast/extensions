import { existsSync } from "fs";

export function getDashAppPath(): string {
  const path = [
    "/Applications/Dash.app",
    "/Applications/Setapp/Dash.app"
  ].find(existsSync)

  if (!path) {
    throw new Error("Dash.app not found");
  }

  return path;
}
