import manifest from '../operations.json';

export type OperationParameter = {
  name: string;
  type?: string;
  required?: boolean;
  enum?: string[];
};

export type ReeplOperation = {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  group: string;
  scopes: string[];
  description: string;
  pathParams?: OperationParameter[];
  query?: OperationParameter[];
  bodyExample?: unknown;
};

export const DEFAULT_BASE_URL = manifest.baseUrl;
export const AUTH_HEADER = manifest.auth.header;

// Keep the Raycast command list generated from the shared integration manifest.
// Zapier, Make, n8n, Postman, and Raycast can therefore be audited against the
// same operation source instead of maintaining separate hand-written lists.
export const REEPL_OPERATIONS = manifest.operations as ReeplOperation[];

export const OPERATION_BY_ID: Record<string, ReeplOperation> = Object.fromEntries(
  REEPL_OPERATIONS.map((operation) => [operation.id, operation]),
);
