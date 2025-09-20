export interface GerritInstance {
  id: string;
  username: string;
  password: string;
  displayName: string;
  url: string;
  unsafeHttps: boolean;
  authorized: boolean;
  createTime: number;
  updateTime: number;
  version: string;
}
