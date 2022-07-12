export interface Preferences {
  sudo: boolean;
}

export interface PortInfo {
  host: string;
  port: number;
}

export interface IProcessInfo {
  pid: number;
  name?: string;
  parentPid?: number;
  user?: string;
  uid?: number;
  protocol?: string;
  portInfo?: PortInfo[];
  internetProtocol?: string;
}
