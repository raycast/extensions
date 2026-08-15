export type MakePagination = {
  sortBy?: string;
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type MakeUserRef = {
  id: number;
  name: string;
  email: string;
};

export type MakeOrganization = {
  id: number;
  name: string;
  timezoneId?: number;
  license?: {
    apiLimit?: number;
    operations?: number;
    restartPeriod?: string;
  };
};

export type ListOrganizationsResponse = {
  organizations: MakeOrganization[];
  pg?: MakePagination;
};

export type GetOrganizationResponse = {
  organization: MakeOrganization;
};

export type MakeTeam = {
  id: number;
  name: string;
  organizationId?: number;
  scenarioDrafts?: boolean;
};

export type ListTeamsResponse = {
  teams: MakeTeam[];
  pg?: MakePagination;
};

export type ScenarioScheduling = {
  type?: string;
  interval?: number;
  date?: string;
  between?: string[];
  time?: string;
  days?: number[];
  months?: number[];
  restrict?: Array<{
    time?: string[];
    days?: number[];
    months?: number[];
  }>;
};

export type MakeScenario = {
  id: number;
  name: string;
  teamId: number;
  hookId?: number | null;
  deviceId?: number | null;
  deviceScope?: string | null;
  concept?: boolean;
  description?: string;
  folderId?: number | null;
  isinvalid?: boolean;
  islinked?: boolean;
  isActive: boolean;
  islocked?: boolean;
  isPaused?: boolean;
  usedPackages?: string[];
  lastEdit?: string;
  scheduling?: ScenarioScheduling;
  iswaiting?: boolean;
  dlqCount?: number;
  createdByUser?: MakeUserRef;
  updatedByUser?: MakeUserRef;
  nextExec?: string;
  created?: string;
  type?: string;
};

export type ListScenariosResponse = {
  scenarios: MakeScenario[];
  pg?: MakePagination;
};

export type GetScenarioResponse = {
  scenario: MakeScenario;
};

export type ScenarioConsumption = {
  scenarioId: number;
  operations: number;
  transfer: number;
};

export type ListScenarioConsumptionsResponse = {
  scenarioConsumptions: ScenarioConsumption[];
  lastReset?: string;
};

export type ScenarioModuleOperations = {
  moduleId: number;
  total: number;
  warnings?: number;
  errors?: number;
};

export type ScenarioModuleOperationsResponse = {
  operations: ScenarioModuleOperations[];
};

export type ScenarioLog = {
  imtId?: string;
  duration?: number;
  operations?: number;
  transfer?: number;
  centicredits?: number;
  organizationId?: number;
  teamId?: number;
  // Make docs call this the execution ID, but in practice it may be missing or
  // come back under a different key depending on log type.
  id?: string | number;
  executionId?: string;
  executionName?: string | null;
  type?: string;
  authorId?: number;
  detail?: {
    author?: {
      name?: string;
      staff?: boolean;
    };
  };
  instant?: boolean;
  timestamp?: string; // date-time
  status?: 1 | 2 | 3;
};

export type ListScenarioLogsResponse = {
  scenarioLogs: ScenarioLog[];
  pg?: MakePagination;
};

export type GetScenarioLogResponse = {
  scenarioLog: ScenarioLog;
};

export type ScenarioExecutionStatus =
  | "RUNNING"
  | "SUCCESS"
  | "WARNING"
  | "ERROR";

export type GetScenarioExecutionDetailsResponse = {
  status: ScenarioExecutionStatus;
  outputs?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    causeModule?: {
      name?: string;
      appName?: string;
    };
  };
};

export type StartStopScenarioResponse = {
  scenario: {
    id: number;
    isActive: boolean;
    islinked?: boolean;
  };
};

// Incomplete Executions (DLQ - Dead Letter Queue)
export type IncompleteExecution = {
  id: string;
  scenarioId: number;
  scenarioName?: string;
  companyId?: number;
  companyName?: string;
  teamId?: number;
  resolved?: boolean;
  deleted?: boolean;
  created?: string;
  reason?: string;
  resultData?: unknown;
};

export type ListIncompleteExecutionsResponse = {
  dlqs: IncompleteExecution[];
  pg?: MakePagination;
};

// Scenario Triggers (Webhooks)
export type ScenarioTrigger = {
  id: number;
  name: string;
  udid?: string;
  scope?: string;
  queueCount?: number;
  queueLimit?: number;
  typeName?: string;
  type?: string;
  url?: string;
  enabled?: boolean;
};

export type ListScenarioTriggersResponse = {
  hooks: ScenarioTrigger[];
};

// Webhook Queue Items (Hook Incomings)
export type WebhookQueueItem = {
  id: string;
  hookId: number;
  date?: string;
  requestId?: string;
  data?: unknown;
};

export type ListWebhookQueueResponse = {
  incomings: WebhookQueueItem[];
  pg?: MakePagination;
};

// Hook Details
export type MakeHook = {
  id: number;
  name: string;
  teamId: number;
  scenarioId?: number;
  queueCount?: number;
  queueLimit?: number;
  url?: string;
  enabled?: boolean;
};

export type GetHookResponse = {
  hook: MakeHook;
};
