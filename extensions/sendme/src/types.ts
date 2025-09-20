import { ChildProcess } from "child_process";

export interface ShareSession {
  id: string;
  filePath: string;
  fileName: string;
  startTime: Date;
  ticket: string;
  process: ChildProcess | null;
  pid?: number;
  isDetached?: boolean;
}

export interface StoredSession {
  id: string;
  pid: number;
  ticket: string;
  filePath: string;
  fileName: string;
  startTime: string;
}
