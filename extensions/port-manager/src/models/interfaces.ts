export interface Preferences {
  sudo: boolean;
}

export interface PortInfo {
  host: string;
  port: number;
}

export interface IProcessInfo {
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
