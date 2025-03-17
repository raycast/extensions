declare module "jsforce" {
  interface ConnectionOptions {
    loginUrl?: string;
    [key: string]: unknown;
  }

  interface SearchResult {
    searchRecords: Array<Record<string, unknown>>;
    [key: string]: unknown;
  }

  interface SObjectResult {
    create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
    update(data: Record<string, unknown>): Promise<Record<string, unknown>>;
    [key: string]: unknown;
  }

  interface RequestHeader {
    headers: Record<string, string>;
    [key: string]: unknown;
  }

  export class Connection {
    constructor(options?: ConnectionOptions);
    login(username: string, password: string): Promise<Record<string, unknown>>;
    search(query: string): Promise<SearchResult>;
    sobject(name: string): SObjectResult;
    request: RequestHeader;
  }
}
