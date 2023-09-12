export interface PortInfo {
  host: string;
  port: number;
}

export interface ProcessInfo {
  pid: number;
  path?: string;
  name?: string;
  parentPid?: number;
  parentPath?: string;
  user?: string;
  uid?: number;
  protocol?: string;
  portInfo?: PortInfo[];
  internetProtocol?: string;
}
