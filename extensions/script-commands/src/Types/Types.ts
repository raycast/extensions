import { 
  ScriptCommand 
} from "@models"

import { 
  IconResult 
} from "@urls"

export interface Command {
  identifier: string
  needsSetup: boolean
  files: Files
  scriptCommand: ScriptCommand
}

export interface Content {
  [identifier: string]: Command
}

export interface File {
  path: string
  link: string
}

export interface Files {
  iconLight: FileNullable
  iconDark: FileNullable
  command: File
}

export enum IconUsage {
  LastScriptUsing,
  BeingUsedByMore,
}

export interface IconPath  {
  filename: string, 
  path: string
}

export enum Progress {
  InProgress,
  Finished,
}

interface Result<T> {
  content: T,
  message: string
}

export enum State {
  Installed,
  NotInstalled,
  NeedSetup,
  Error,
}

export type ViewState = { 
  needsReload: boolean 
}

export type SourceCode = string

export type StateResult = Result<State>

export type SourceCodeResult = Result<SourceCode>

export type IconPathNullable = IconPath | null

export type IconResultNullable = IconResult | null

export type FileNullable = File | null