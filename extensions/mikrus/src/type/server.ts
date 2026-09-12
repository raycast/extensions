import { HookType, PromiseFunctionNoArgType, PromiseFunctionWithOneArgType } from "./hook";

export interface ServerType {
  server_id: string;
  server_name: string;
  expires: string;
  param_ram: string;
  param_disk: string;
  apiKey: string | undefined;
  info: ServerInfoType | undefined;
  logs: ServerLogType[] | undefined;
  ports: Array<number> | undefined;
  clouds: ServerCloudType[] | undefined;
}

export interface ServerInfoType {
  server_id: string;
  server_name: string;
  expires: string;
  expires_cytrus: string;
  expires_storage: string;
  param_ram: string;
  param_disk: string;
  lastlog_panel: string;
  mikrus_pro: string;
}

export interface ServerLogType {
  id: string;
  server_id: string;
  task: string;
  when_created: string;
  when_done: string;
  output: string;
}

export interface ServerCloudType {
  srvID: string;
  port_nr: string;
  status: string;
  expires: string;
  size: string;
  disk_used: string;
  disk_total: string;
  cpu_percent: string;
  ram_used: string;
  ram_total: string;
}

export type ServerHookType = HookType<ServerType> & {
  reload: PromiseFunctionNoArgType;
  update: PromiseFunctionWithOneArgType<ServerType>;
  detail: PromiseFunctionWithOneArgType<ServerType>;
  itemRestart: PromiseFunctionWithOneArgType<ServerType>;
  itemAmfetamine: PromiseFunctionWithOneArgType<ServerType>;
};
