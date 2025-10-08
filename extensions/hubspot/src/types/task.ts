export interface Data {
  total: number;
  results: Task[];
  paging: Paging;
}

export interface Task {
  id: string;
  properties: Properties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  associations?: {
    contact?: {
      results: Array<{ id: string; type: string }>;
    };
    company?: {
      results: Array<{ id: string; type: string }>;
    };
    deal?: {
      results: Array<{ id: string; type: string }>;
    };
    contacts?: {
      results: Array<{ id: string; type: string }>;
    };
    companies?: {
      results: Array<{ id: string; type: string }>;
    };
    deals?: {
      results: Array<{ id: string; type: string }>;
    };
  };
}

export interface Properties {
  hs_task_subject: string;
  hs_task_body: string;
  hs_task_status: string;
  hs_task_priority: string;
  hs_timestamp: string;
  hs_task_type: string;
  hubspot_owner_id: string;
  createdate: string;
  hs_lastmodifieddate: string;
}

export interface Paging {
  next: Next;
}

export interface Next {
  after: string;
  link: string;
}
