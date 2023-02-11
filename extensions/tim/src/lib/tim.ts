import { runAppleScript } from "run-applescript";
import { buildScriptEnsuringTimIsRunning, runAppleScriptSilently } from "./apple-script";
import { getApplications, showToast, Toast } from "@raycast/api";

import { TimExport, UUID } from "../types/tim";

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

export async function getTask(id: UUID) {
  //
}

export async function createTask() {
  //
}

export async function startTask(id: UUID) {
  //
}

export async function toggleTimer(): Promise<UUID> {
  const script = buildScriptEnsuringTimIsRunning(`toggletimer`);
  return runAppleScript(script);
}

export async function openTaskManager() {
  const script = buildScriptEnsuringTimIsRunning(`opentaskmanager`);
  await runAppleScriptSilently(script);
}

export async function openNewTask() {
  const script = buildScriptEnsuringTimIsRunning(`opennewtask`);
  await runAppleScriptSilently(script);
}
export async function openNavigator() {
  const script = buildScriptEnsuringTimIsRunning(`opennavigator`);
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

export async function getData(): Promise<TimExport> {
  const jsonString = await exportData();
  return JSON.parse(jsonString);
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
