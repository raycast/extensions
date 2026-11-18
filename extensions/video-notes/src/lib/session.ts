import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { strings } from "./strings";

export function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export type Session = {
  dir: string;
  name: string;
  notesPath: string;
  shotsDir: string;
};

export function sessionAt(dir: string): Session {
  return { dir, name: basename(dir), notesPath: join(dir, "notes.md"), shotsDir: join(dir, "shots") };
}

const ACTIVE_KEY = "activeSession";

export async function activeSessionDir(): Promise<string | undefined> {
  return LocalStorage.getItem<string>(ACTIVE_KEY);
}

export async function activeSession(): Promise<Session> {
  const dir = await activeSessionDir();
  if (!dir || !existsSync(join(dir, "notes.md"))) {
    throw new Error(strings.noSession);
  }
  return sessionAt(dir);
}

export async function setActiveSession(dir: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_KEY, dir);
}

const urlKey = (session: Session) => `recordingUrl:${session.dir}`;

export async function recordingUrl(session: Session): Promise<string | undefined> {
  return LocalStorage.getItem<string>(urlKey(session));
}

export async function setRecordingUrl(session: Session, url: string): Promise<void> {
  await LocalStorage.setItem(urlKey(session), url);
}
