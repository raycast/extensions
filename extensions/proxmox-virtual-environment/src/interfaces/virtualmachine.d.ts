export interface VirtualMachine {
  cpus: int;
  disk: number;
  memory: number;
  name: string;
  node: string;
  runningMachineType: string;
  qemuVersion: string;
  status: string;
  qmpstatus: string;
  tags: string;
  template: boolean;
  uptime: number;
  vmid: int;
  url: string;
}
