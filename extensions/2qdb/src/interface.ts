/* eslint-disable @typescript-eslint/no-explicit-any */


export interface ILocalStorage {
  id: string;
}

export interface IConfigDB extends ILocalStorage {
  databaseType: string;
  database: string;
  host: string;
  port: string;
  password: string;
  user: string;
  createdAt: string;
  tag: string[];
  env: string;
  isDefault: boolean;
  note: string;
}

export interface IQueryHistory extends ILocalStorage {
  query: string;
  result: any;
  createdAt: string;
  configID: string;
}

export interface ISyncData  {
  dbConfigs: IConfigDB[]
}