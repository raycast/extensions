export interface Storage {
  active: boolean;
  size: number;
  content: string;
  enabled: boolean;
  shared: boolean;
  name: string;
  node: string;
  type: string;
  used: number;
  utilization: number;
}
