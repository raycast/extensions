import type {
  ZabbixParamsTriggerGet,
  ZabbixResponseEventGetResult,
  ZabbixResponseHostGetResult,
  ZabbixresponseItemGetResult,
  ZabbixResponseTriggerGetResult,
} from "@api/zabbix/types";

/* Zabbix Server Config */
export interface LocalStorageZabbixServer {
  /* Configuration UUID */
  uuid: string;
  /* Zabbix Server Name */
  name: string;
  /* Zabbix Server API URL */
  url: string;
  /* Zabbix Server API Key */
  key: string;
}

/* List.Item Data for all View */
interface DataView {
  /* Zabbix Server UUID */
  server_uuid: string;
  /* Zabbix Server Name */
  server_name: string;
}

/* List.Item Data for ProblemsView */
export interface DataProblemsView
  extends DataView, ZabbixResponseTriggerGetResult {
  event_get_result?: ZabbixResponseEventGetResult;
}

/* List.Item Data for HostsView */
export interface DataHostsView extends DataView, ZabbixResponseHostGetResult {}

/* List.Item Data for ItemsView */
export interface DataItemsView extends DataView, ZabbixresponseItemGetResult {}

/* List.Item Data for TriggersView */
export interface DataTriggersView
  extends DataView, ZabbixResponseTriggerGetResult {}

/* launchContext for Command Problems */
export interface LaunchContextProblems {
  serverUUID: string;
  params: ZabbixParamsTriggerGet;
}
