export interface Company {
  id: string;
  properties: Properties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

interface Properties {
  name: string;
  createdate: string;
  domain: string;
  hs_lastmodifieddate: string;
  description: string;
  industry: string;
  [key: string]: string | undefined;
}

export interface Data {
  total: number;
  results: Company[];
  paging: Paging;
}

interface Paging {
  next: Next;
}

interface Next {
  after: string;
  link: string;
}
