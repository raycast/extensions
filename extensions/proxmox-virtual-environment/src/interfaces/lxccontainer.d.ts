export interface LXCContainer {
  cpus: int;
  disk: number;
  memory: number;
  swap: number;
  swapUtil: number;
  name: string;
  node: string;
  status: string;
  qmpstatus: string;
  tags: string;
  template: boolean;
  uptime: number;
  vmid: int;
  url: string;
}
