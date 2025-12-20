declare module "node-app-store-connect-api" {
  interface ApiConfig {
    issuerId: string;
    apiKey: string;
    privateKey: string;
  }

  interface ApiClient {
    read: (path: string) => Promise<unknown>;
    readAll: (path: string) => Promise<unknown>;
  }

  export function api(config: ApiConfig): Promise<ApiClient>;
}
