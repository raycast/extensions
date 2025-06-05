// Tag type is defined below

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
  tags: Tag[]; // Use the Tag type defined below
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
  id?: string; // Added optional id field based on example
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

// Represents a Tag in n8n
export interface Tag {
  id?: string; // ID might not always be present depending on context
  name: string;
  createdAt?: string; // Optional fields from API
  updatedAt?: string; // Optional fields from API
}

// Type definition for saved webhook trigger commands
export interface SavedCommand {
  id: string; // Unique ID (e.g., generated with crypto.randomUUID())
  name: string; // User-defined name
  method: string;
  url: string; // Store the full trigger URL
  headers?: string; // Store as string (easier for LocalStorage)
  queryParams?: string; // Store as string
  body?: string; // Store as string
}
