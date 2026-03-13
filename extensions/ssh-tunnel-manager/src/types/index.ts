export enum Storage {
  List = "list",
  AlivePidList = "alivePidList",
}

export enum TunnelType {
  Local = "local",
  Remote = "remote",
}

export type Values = {
  name: string;
  localPort: string;
  user: string;
  sshPort: string;
  sshHost: string;
  remoteHost: string;
  remotePort: string;
  proxy: boolean;
  type: TunnelType;
  identityFile: string[];
};

export type ListData = {
  name: string;
  pid: string | null;
} & Partial<Values>;
