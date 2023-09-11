import { getApplications, getPreferenceValues } from "@raycast/api";
import fs from "fs";
const { spawn } = require("child_process");
const { exec } = require("child_process");

export async function isAndroidStudioInstalled() {
  return (await getApplications()).find((app) => {
    (app.name === "Android studio") != undefined ? true : false;
  });
}

export async function listDirectories(folder: string) {
  return fs.promises.readdir(folder, { withFileTypes: true });
}

export function emulatorPath(): string {
  return `${androidSDK()}/emulator/emulator`;
}

export function androidSDK() {
  const expandTilde = require("expand-tilde");
  const sdk = getPreferenceValues().androidSDK;
  return sdk.replace("~", expandTilde("~"));
}

export function isValidDirectory(path: string) {
  try {
    fs.lstatSync(path).isDirectory();
  } catch (error) {
    return false;
  }
  return true;
}

export function hasReadPermission(path: string) {
  let err;
  try {
    fs.accessSync(path, fs.constants.R_OK);
  } catch (error) {
    console.log("%s doesn't have read permission", path);
    err = error;
  }
  return err != null;
}

export function runCommand(
  cmd: string,
  output: (out: string) => void,
  error: (error: string) => void
) {
  const childProcess = spawn(cmd, [], { shell: true });

  childProcess.stdout.on("data", function (data: string) {
    output(data.toString());
    console.log("stdout: " + data);
  });

  childProcess.stderr.on("data", function (data: string) {
    console.log("stderr: " + data);
    error(data.toString());
  });
}
