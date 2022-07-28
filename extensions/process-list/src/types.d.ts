import { Systeminformation } from "systeminformation";

export interface DataState {
  results: ProcessItem[];
  loading: boolean;
}

export type ProcessItem = Omit<Systeminformation.ProcessesProcessData, "pid"> & { pid: string };
