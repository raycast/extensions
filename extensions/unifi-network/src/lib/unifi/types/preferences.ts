export interface Preferences {
  host?: string;
  apiKey: string;
  // Remote access not supported yet as it requires a different API endpoint
  remote?: boolean;
  polling?: boolean;
}
