export interface LogItem {
  name: string;
  hostname: string;
  pid: number;
  service: string;
  phase: string;
  level: number;
  marker: string;
  msg: string;
  time: string;
  v: number;
}
