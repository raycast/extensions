import { runAppleScript } from "@raycast/utils";
import { promises as fs } from "node:fs";
import { environment } from "@raycast/api";
import path from "node:path";
import { BadgerApplication } from "./apps.ts";

function useScripts() {
  const assets = path.join(environment.assetsPath, "scripts");

  async function inDock(app: BadgerApplication) {
    const script = await fs.readFile(path.join(assets, "inDock.applescript"));
    const result = await runAppleScript(script.toString(), [app.bundleId]);
    return result === "true";
  }

  async function isOpen(app: BadgerApplication) {
    const script = await fs.readFile(path.join(assets, "isOpen.applescript"));
    const result = await runAppleScript(script.toString(), [app.bundleId]);
    return result === "true";
  }

  async function getCount(app: BadgerApplication) {
    const script = await fs.readFile(path.join(assets, "getCount.applescript"));
    const result = await runAppleScript(script.toString(), [app.name]);
    return result;
  }

  return { inDock, isOpen, getCount };
}

export default useScripts;
