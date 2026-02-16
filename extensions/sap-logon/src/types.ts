export interface SAPSystem {
  id: string;
  systemId: string;
  applicationServer: string;
  instanceNumber: string;
  client: string;
  username: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface SAPSystemFormValues {
  systemId: string;
  applicationServer: string;
  instanceNumber: string;
  client: string;
  username: string;
  password: string;
  language: string;
}
