export interface Contact {
  id: string;
  properties: Properties;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

interface Properties {
  company: string;
  createdate: string;
  email: string;
  firstname: string;
  lastmodifieddate: string;
  lastname: string;
  phone: string;
  website: string;
}

export interface Data {
  total: number;
  results: Contact[];
  paging: Paging;
}

interface Paging {
  next: Next;
}

interface Next {
  after: string;
  link: string;
}
