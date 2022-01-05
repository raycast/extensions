import { ScriptCommand } from "@models";

import { IconResult } from "@urls";

export interface Command {
  identifier: string;
  needsSetup: boolean;
  sha: string;
  files: Files;
  scriptCommand: ScriptCommand;
}

export interface Content {
  [identifier: string]: Command;
}

export enum ContentType {
  Raw,
  Normal,
}

export interface File {
  path: string;
  link: string;
}

export interface Files {
  iconLight: FileNullable;
  iconDark: FileNullable;
  command: File;
}

export enum IconUsage {
  LastScriptUsing,
  BeingUsedByMore,
}

interface IconPath {
  filename: string;
  path: string;
}

export enum Progress {
  InProgress,
  Finished,
}

interface Result<T> {
  content: T;
  message: string;
}

export enum State {
  Installed,
  NotInstalled,
  NeedSetup,
  ChangesDetected,
  Error,
}

export type Process = {
  identifier: string;
  progress: Progress;
  state: State;
  current: number;
  total: number;
};

export type Filter = State | string | null;

export type StateResult = Result<State>;

export type IconPathNullable = IconPath | null;

export type IconResultNullable = IconResult | null;

export type FileNullable = File | null;
