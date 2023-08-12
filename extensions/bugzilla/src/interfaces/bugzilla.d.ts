export interface BugzillaInstance {
  id: string;
  login: string;
  apiKey: string;
  displayName: string;
  url: string;
  unsafeHttps: boolean;
  authorized: boolean;
  createTime: number;
  updateTime: number;
  version: string;
  customHeader?: string;
}
