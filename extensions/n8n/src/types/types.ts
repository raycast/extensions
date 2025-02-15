export interface Workflow {
  id: number;
  name: string;
  active: boolean;
  nodes: Node[];
  connections: Connections;
  createdAt: string;
  updatedAt: string;
  settings: Record<string, boolean | string | number>;
  staticData: null;
  tags: string[];
}

export interface Connections {
  Start?: Start;
}

export interface Start {
  main: Array<Main[]>;
}

export interface Main {
  node: string;
  type: string;
  index: number;
}

export interface Node {
  parameters: Parameters;
  name: string;
  type: string;
  typeVersion: number;
  position: number[];
  credentials?: Credentials;
}

export interface Credentials {
  smtp: SMTP;
}

export interface SMTP {
  id: null;
  name: string;
}

export interface Parameters {
  content?: string;
  height?: number;
  width?: number;
  fromEmail?: string;
  toEmail?: string;
  subject?: string;
  text?: string;
  options?: Options;
}

export interface Options {
  allowUnauthorizedCerts: boolean;
}
