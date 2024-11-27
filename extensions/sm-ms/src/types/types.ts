export interface SMMSResponse {
  success: boolean;
  code: string;
  message: string;
  data: UserData | ImageData[] | ImageData;
  RequestId: string;
}

export interface UserData {
  username: string;
  email: string;
  role: string;
  group_expire: string;
  email_verified: number;
  disk_usage: string;
  disk_limit: string;
  disk_usage_raw: number;
  disk_limit_raw: number;
}

export interface ImageData {
  width: number;
  height: number;
  filename: string;
  storename: string;
  size: number;
  path: string;
  hash: string;
  created_at: string;
  url: string;
  delete: string;
  page: string;
}
