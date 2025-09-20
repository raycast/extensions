export type Process = {
  id: number;
  pid: number;
  cpu: number;
  mem: number;
  type: "prefPane" | "app" | "binary" | "aggregatedApp";
  path: string;
  processName: string;
  appName: string | undefined;
};
