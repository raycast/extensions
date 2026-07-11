import { getApplications, showToast, Toast, captureException } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { exec } from "child_process";

import { Data, UUID } from "../types/tim";
import { buildScriptEnsuringTimIsRunning, runAppleScriptSilently } from "./apple-script";
import { isNoActiveTaskError } from "../helpers/error";

export async function installedWrapper<T extends () => void>(cb: T) {
  const timAvailable = await checkIfTimInstalled();
  if (!timAvailable) {
    return showToast({
      title: "Tim is not installed",
      style: Toast.Style.Failure,
    });
  }

  return cb();
}

export async function getTask(title: number): Promise<UUID | undefined> {
  const script = buildScriptEnsuringTimIsRunning(`getTask "${title}"`);
  return runAppleScript(script);
}

export async function getActiveTask(): Promise<UUID | undefined> {
  try {
    const script = buildScriptEnsuringTimIsRunning("getActiveTask");
    return await runAppleScript(script);
  } catch (error) {
    if (isNoActiveTaskError(error)) return undefined;

    captureException(error);
  }
}

export async function createTask(title: string): Promise<UUID> {
  const script = buildScriptEnsuringTimIsRunning(`createTask title "${title}"`);
  return runAppleScript(script);
}

export async function startTask(id: UUID) {
  const script = buildScriptEnsuringTimIsRunning(`startTask "${id}"`);
  runAppleScript(script);
}

/**
 * Open an entity with a deeplink in the application
 * @param id Id of a group or task
 */
export async function openInTim(id: UUID) {
  exec(`open tim://${id}`);
}

export async function toggleTimer(): Promise<UUID | undefined> {
  const script = buildScriptEnsuringTimIsRunning(`toggletimer`);
  return runAppleScript(script);
}

export async function openTaskManager() {
  const script = buildScriptEnsuringTimIsRunning(`opentaskmanager`);
  await runAppleScriptSilently(script);
}

export async function openActiveRecord() {
  const script = buildScriptEnsuringTimIsRunning(`openactiverecord`);
  await runAppleScriptSilently(script);
}

export async function importData(filePath: string) {
  const script = buildScriptEnsuringTimIsRunning(`import (POSIX file "${filePath}")`);
  await runAppleScript(script);
}

export async function exportData() {
  const script = buildScriptEnsuringTimIsRunning(`export`);
  return await runAppleScript(script);
}

export async function getData(): Promise<Data> {
  try {
    const jsonString = await exportData();
    return JSON.parse(jsonString);
  } catch (error) {
    captureException(error);
    showFailureToast(error);
    throw error;
  }
}

export async function hasData(): Promise<boolean> {
  const data = await getData();
  return Object.keys(data.tasks ?? {}).length > 0;
}

async function checkIfTimInstalled(): Promise<boolean> {
  const apps = await getApplications();
  const timInstalled = apps.find((app) => app.bundleId === "neat.software.Tim");

  return timInstalled !== undefined;
}
