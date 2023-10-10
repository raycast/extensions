export interface BugzillaInstance {
  id: string;
  username: string;
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
