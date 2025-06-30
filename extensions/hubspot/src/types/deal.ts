export interface Data {
  total: number;
  results: Deal[];
  paging: Paging;
}

export interface Deal {
  id: string;
  properties: Properties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface Properties {
  amount: string;
  closedate: string;
  createdate: string;
  dealname: string;
  dealstage: string;
  hs_lastmodifieddate: string;
  hubspot_owner_id: string;
  pipeline: string;
}

export interface Paging {
  next: Next;
}

export interface Next {
  after: string;
  link: string;
}
