import { spawnSync } from "child_process";
import { showHUD } from "@raycast/api";

function hideDesktop(): string {
  spawnSync("defaults", ["write", "com.apple.finder", "CreateDesktop", "false"]);
  spawnSync("killall", ["Finder"]);
  return "Desktop Hidden 🙈";
}

function showDesktop(): string {
  spawnSync("defaults", ["write", "com.apple.finder", "CreateDesktop", "true"]);
  spawnSync("killall", ["Finder"]);
  return "Desktop Visible 🙉";
}

export default async function () {
  const { stdout } = spawnSync("defaults", ["read", "com.apple.finder", "CreateDesktop"], {
    encoding: "utf-8",
  });
  const message = stdout.trim() === "false" ? showDesktop() : hideDesktop();
  await showHUD(message);
}
