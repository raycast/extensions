import { open } from "@raycast/api";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { APP_URL } from "../constants/raycast";

const DESKTOP_APP_SCHEME = "circleback://";
const CIRCLEBACK_APP_BUNDLE = "Circleback.app";

// getApplications times out after 5 seconds while Raycast is busy.
async function isDesktopAppInstalled() {
  return ["/Applications", join(homedir(), "Applications")].some((directory) =>
    existsSync(join(directory, CIRCLEBACK_APP_BUNDLE)),
  );
}

function buildDesktopDeepLink(path: string): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${DESKTOP_APP_SCHEME}${normalizedPath}`;
}

function buildWebUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${APP_URL}${normalizedPath}`;
}

export async function resolveUrl(path: string): Promise<string> {
  if (await isDesktopAppInstalled()) return buildDesktopDeepLink(path);
  return buildWebUrl(path);
}

export async function openMeeting(meetingId: string) {
  const url = await resolveUrl(`/meetings/${meetingId}`);
  await open(url);
}

export async function openNewMeeting() {
  const url = await resolveUrl("/meetings/new");
  await open(url);
}
