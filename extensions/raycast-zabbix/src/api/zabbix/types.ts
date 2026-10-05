/* Zabbix Server Config */
export interface ZabbixServerConfig {
  url: string;
  key: string;
}

/* Generics */
interface zabbixPostGeneric {
  jsonrpc: "2.0";
  id: number;
}
export interface zabbixResponseGeneric {
  jsonrpc: "2.0";
  id: number;
}

/* Zabbix Response */
export interface ZabbixResponse extends zabbixResponseGeneric {
  result: Record<string, unknown>;
}

/* Zabbix Error Response */
export interface ZabbixResponseError extends zabbixResponseGeneric {
  error: ZabbixError;
}
export function isZabbixResponseError(
  obj: unknown,
): obj is ZabbixResponseError {
  if (!obj || typeof obj !== "object") return false;

  return (
    "jsonrpc" in obj &&
    obj.jsonrpc === "2.0" &&
    "error" in obj &&
    isZabbixError(obj.error) &&
    "id" in obj &&
    typeof obj.id === "number"
  );
}
export interface ZabbixError {
  code: number;
  message: string;
  data: string;
}
export function isZabbixError(obj: unknown): obj is ZabbixError {
  if (!obj || typeof obj !== "object") return false;

  return (
    "code" in obj &&
    typeof obj.code === "number" &&
    "message" in obj &&
    typeof obj.message === "string" &&
    "data" in obj &&
    typeof obj.data === "string"
  );
}

/* Zabbix POST */
export interface ZabbixPost extends zabbixPostGeneric {
  method:
    | "apiinfo.version"
    | "host.get"
    | "host.update"
    | "host.delete"
    | "item.get"
    | "trigger.get"
    | "trigger.update"
    | "event.get"
    | "event.acknowledge";
  params: Record<string, unknown> | string[];
}

/* Zabbix POST, method: "apiinfo.version" */
export interface ZabbixPostApiInfoVersion extends zabbixPostGeneric {
  method: "apiinfo.version";
  params: Record<string, unknown>;
}
/* Zabbix Response, method: "apiinfo.version" */
export interface ZabbixResponseApiInfoVersion extends zabbixResponseGeneric {
  result: string;
}

/* Zabbix POST, method: "host.get" */
export interface ZabbixPostHostGet extends zabbixPostGeneric {
  params: ZabbixParamsHostGet;
}
export interface ZabbixParamsHostGet {
  output?: string[] | "extend";
  selectHostGroups?: string[] | "extend";
  selectInterfaces?: string[] | "extend";
  selectInventory?: string[] | "extend";
  selectItems?: string[] | "extend";
  selectTags?: string[] | "extend";
  selectTriggers?: string[] | "extend";
  sortified?: string[] | string;
  sortorder?: "ASC" | "DESC";
}
/* Zabbix Response, method: "host.get" */
export interface ZabbixResponseHostGet extends zabbixResponseGeneric {
  result: ZabbixResponseHostGetResult[];
}
export interface ZabbixResponseHostGetResult extends ZabbixObjectHost {
  items?: Record<string, unknown>;
  hostgroups?: ZabbixObjectHostGroup[];
  inventory?: Record<string, unknown>;
  interfaces?: ZabbixObjectInterface[];
  tags?: ZabbixObjectTag[];
  triggers?: ZabbixObjectTrigger[];
}

export interface ZabbixParamsTag {
  tag: string;
  value: string;
  operator: 0 | 1 | 2 | 3 | 4 | 5;
}

/* Zabbix POST, method: "host.update" */
export interface ZabbixPostHostUpdate extends zabbixPostGeneric {
  params: ZabbixParamsHostUpdate;
}
export interface ZabbixParamsHostUpdate {
  hostid?: string;
  status?: 0 | 1;
}
/* Zabbix Response, method: "host.update" */
export interface ZabbixResponseHostUpdate extends zabbixResponseGeneric {
  result: ZabbixResponseHostUpdateResult;
}
export interface ZabbixResponseHostUpdateResult {
  hostids: string[];
}

/* Zabbix POST, method: "host.delete" */
export interface ZabbixPostHostDelete extends zabbixPostGeneric {
  params: string[];
}
/* Zabbix Response, method: "host.delete" */
export interface ZabbixResponseHostDelete extends zabbixResponseGeneric {
  result: ZabbixResponseHostDeleteResult;
}
export interface ZabbixResponseHostDeleteResult {
  hostids: string[];
}

/* Zabbix POST, method: "item.get" */
export interface ZabbixPostItemGet extends zabbixPostGeneric {
  method: "item.get";
  params: ZabbixParamsItemGet;
}
export interface ZabbixParamsItemGet {
  itemids?: string | string[];
  groupids?: string | string[];
  templateids?: string | string[];
  hostids?: string | string[];
  proxyids?: string | string[];
  interfaceids?: string | string[];
  graphids?: string | string[];
  triggerids?: string | string[];
  webitems?: string;
  inherited?: boolean;
  templated?: boolean;
  monitored?: boolean;
  group?: string;
  host?: string;
  evaltype?: 0 | 2;
  tags?: ZabbixParamsTag[];
  with_triggers?: boolean;
  selectHosts?: string[] | "extend";
  selectInterfaces?: string[] | "extend";
  selectTriggers?: string[] | "extend";
  selectGraphs?: string[] | "extend";
  selectDiscoveryRule?: string[] | "extend";
  selectItemDiscovery?: string[] | "extend";
  selectProcessing?: string[] | "extend";
  selectTags?: string[] | "extend";
  selectValueMap?: string[] | "extend";
  filter?: Record<string, string | string[]>;
  limitSelects?: number;
  sortfield?: string | string[];
  countOutput?: boolean;
  editable?: boolean;
  excludeSearch?: boolean;
  limit?: number;
  output?: string | string[];
  preservekeys?: boolean;
  search?: Record<string, string | string[]>;
  searchByAny?: boolean;
  searchWildcardsEnabled?: boolean;
  sortorder?: string | string[];
  startSearch?: boolean;
}
/* Zabbix Response, method: "item.get" */
export interface ZabbixResponseItemGet extends zabbixResponseGeneric {
  result: ZabbixresponseItemGetResult[];
}
export interface ZabbixresponseItemGetResult extends ZabbixObjectItem {
  hosts?: ZabbixObjectHost[];
  triggers?: ZabbixObjectTrigger[];
  tags?: ZabbixObjectTag[];
}

/* Zabbix POST, method: "trigger.get" */
export interface ZabbixPostTriggerGet extends zabbixPostGeneric {
  method: "trigger.get";
  params: ZabbixParamsTriggerGet;
}
export interface ZabbixParamsTriggerGet {
  triggerids?: string[];
  groupids?: string[];
  templateids?: string[];
  hostids?: string | string[];
  itemids?: string[];
  functions?: string[];
  group?: string;
  host?: string[];
  inherited?: boolean;
  templated?: boolean;
  dependent?: boolean;
  monitored?: boolean;
  active?: boolean;
  maintenance?: boolean;
  withUnacknowledgedEvents?: boolean;
  withAcknowledgedEvents?: boolean;
  withLastEventUnacknowledged?: boolean;
  skipDependent?: boolean;
  lastChangeSince?: number;
  lastChangeTill?: number;
  only_true?: boolean;
  min_severity?: number;
  evaltype?: number;
  tags?: {
    tag: string;
    value: string;
    operator: 0 | 1 | 2 | 3 | 4 | 5;
  };
  expandComment?: boolean;
  expandDescription?: boolean;
  expandExpression?: boolean;
  selectHostGroups?: string[] | "extend";
  selectHosts?: string[] | "extend";
  selectItems?: string[] | "extend";
  selectFunctions?: string[] | "extend";
  selectDependencies?: string[] | "extend";
  selectDiscoveryTule?: string[] | "extend";
  selectLastEvent?: string[] | "extend";
  selectTags?: string[] | "extend";
  selectTemplateGroups?: string[] | "extend";
  selectTriggerDiscovery?: string[] | "extend";
  filter?: Record<string, unknown>;
  limitSelects?: number;
  sortfield?: string;
  countOutput?: boolean;
  editable?: boolean;
  excludeSearch?: boolean;
  limit?: number;
  output?: string[] | "extend";
  preservekeys?: boolean;
  search?: Record<string, unknown>;
  searchByAny?: boolean;
  searchWildcardsEnabled?: boolean;
  sortorder?: "ASC" | "DESC";
  startSearch?: boolean;
}

/* Zabbix Response, method: "trigger.get" */
export interface ZabbixResponseTriggerGet extends zabbixResponseGeneric {
  result: ZabbixResponseTriggerGetResult[];
}
export interface ZabbixResponseTriggerGetResult {
  triggerid: string;
  description?: string;
  expression?: string;
  priority?: string;
  status?: string;
  value?: string;
  lastchange?: string;
  comments?: string;
  error?: string;
  state?: string;
  type?: string;
  url?: string;
  hosts?: ZabbixObjectHost[];
  tags?: ZabbixObjectTag[];
  items?: ZabbixObjectItem[];
  lastEvent?: ZabbixObjectEvent;
}

/* Zabbix POST, method "trigger.update" */
export interface ZabbixPostTriggerUpdate extends zabbixPostGeneric {
  method: "trigger.update";
  params: ZabbixParamsTriggerUpdate;
}
export interface ZabbixParamsTriggerUpdate {
  triggerid?: string;
  priority?: string;
  status?: 0 | 1;
}

/* Zabbix response, method "trigger.update" */
export interface ZabbixResponseTriggerUpdate extends zabbixResponseGeneric {
  method: "trigger.update";
  result: ZabbixResponseTriggerUpdateResult;
}
export interface ZabbixResponseTriggerUpdateResult {
  triggerids: string[];
}

/* Zabbix POST, method: "event.get" */
export interface ZabbixPostEventGet extends zabbixPostGeneric {
  method: "event.get";
  params: ZabbixParamsEventGet;
}
export interface ZabbixParamsEventGet {
  eventids?: string[];
  selectAcknowledges?: string;
  selectTags?: string;
}

/* Zabbix Response, method: "event.get" */
export interface ZabbixResponseEventGet extends zabbixResponseGeneric {
  result: ZabbixResponseEventGetResult[];
}
export interface ZabbixResponseEventGetResult extends ZabbixObjectEvent {
  tags?: ZabbixObjectTag[];
  acknowledges?: ZabbixObjectAcknowledges[];
}

/* Zabbix POST, method: "event.acknowledge" */
export interface ZabbixPostEventAcknowledge extends zabbixPostGeneric {
  params: ZabbixPostEventAcknowledgeParams;
}
export interface ZabbixPostEventAcknowledgeParams {
  eventids?: string | string[];
  action?: number;
  message?: string;
  severity?: number;
  suppress_until?: number;
}

/* Zabbix Response, method: "event.acknowledge" */
export interface ZabbixResponseEventAcknowledge extends zabbixResponseGeneric {
  result: ZabbixResponseEventAcknowledgeResult;
}
export interface ZabbixResponseEventAcknowledgeResult {
  eventids: string[];
}

/* Zabbix Host Object */
export interface ZabbixObjectHost {
  hostid: string;
  name?: string;
  description?: string;
  status?: string;
  flags?: string;
  maintenance_status: string;
}

/* Zabbix Group Object */
export interface ZabbixObjectHostGroup {
  groupid: string;
  name?: string;
  uuid?: string;
}

/* Zabbix Tag Object */
export interface ZabbixObjectTag {
  tag: string;
  value: string;
}

/* Zabbix Event Object */
export interface ZabbixObjectEvent {
  eventid: string;
  source?: number;
  object?: string;
  objectid?: number;
  acknowledged?: string;
  clock?: number;
  ns?: number;
  name?: string;
  value?: number;
  severity?: number;
  r_eventis?: number;
  c_eventid?: number;
  cause_eventid?: number;
  correlationid?: number;
  userid?: number;
  suppressed?: number;
  opdata?: string;
  urls?: string[];
}

/* Zabbix Acknoeledges Object */
export interface ZabbixObjectAcknowledges {
  acknowledgeid: string;
  userid: string;
  clock: string;
  message: string;
  action: string;
  old_severity: string;
  new_Severity: string;
  suppress_until: string;
  taskid: string;
  username: string;
  name: string;
  surname: string;
}

/* Zabbix Item Object */
export interface ZabbixObjectItem {
  itemid: string;
  hostid?: string;
  name_resolved?: string;
  type?: string;
  value_type?: string;
  description?: string;
  error?: string;
  history?: string;
  lastclock?: string;
  lastvalue?: string;
  prevvalue?: string;
  state?: string;
  status?: string;
  units?: string;
}

/* Zabbix Object interface */
export interface ZabbixObjectInterface {
  interfaceid: string;
  type?: string;
  ip?: string;
  dns?: string;
  port?: string;
  useip?: string;
  available?: string;
  error?: string;
  error_from?: string;
  disable_until?: string;
}

/* Zabbix Object trigger */
export interface ZabbixObjectTrigger {
  triggerid: string;
  description?: string;
  comments?: string;
  expression?: string;
  /** Whether the trigger is enabled or disabled.
   *
   * Possible values:
   * 0 - (default) enabled;
   * 1 - disabled.
   */
  status?: string;
  /**
   * Whether the trigger is in OK or problem state.
   *
   * Possible values:
   * 0 - (default) OK;
   * 1 - problem.
   *
   * Property behavior:
   * - read-only
   */
  value?: string;
  priority?: string;
  lastchange?: string;
  error?: string;
  uuid?: string;
}
