export interface Node {
  name: string;
  level: string;
  cpu: int;
  cpuUtil: double;
  mem: int;
  memUtil: double;
  disk: int;
  status: string;
  uptime: int;
}
