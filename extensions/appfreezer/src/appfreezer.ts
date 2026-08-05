import { getApplications, open } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { createAppFreezerClient } from "./client";

export {
  AgentConnectionError,
  AgentLaunchError,
  AgentTimeoutError,
  AppFreezerCLIMissingError,
  AppFreezerNotInstalledError,
} from "./client";

const client = createAppFreezerClient({
  getInstalledApplications: getApplications,
  accessFile: access,
  runCLI: (path, arguments_, timeoutMs) =>
    new Promise((resolve, reject) => {
      execFile(
        path,
        arguments_,
        { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024, encoding: "utf8" },
        (error, stdout, stderr) => {
          if (error) {
            Object.assign(error, { stderr });
            reject(error);
          } else {
            resolve({ stdout, stderr });
          }
        },
      );
    }),
  openURL: open,
  makeRequestID: randomUUID,
});

export const loadSnapshot = client.loadSnapshot;
export const performAction = client.performAction;
export const openSettings = client.openSettings;
