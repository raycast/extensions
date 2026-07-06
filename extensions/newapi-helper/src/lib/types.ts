/** A single PackyAPI configuration stored in LocalStorage. */
export interface ApiConfig {
  id: string;
  name: string;
  baseUrl: string;
  accessToken: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserData {
  id: number;
  username: string;
  display_name?: string;
  group?: string;
  quota: number;
  used_quota: number;
  request_count: number;
}

export interface UserApiResponse {
  success: boolean;
  message?: string;
  data?: UserData;
}

export interface DataPoint {
  quota: number;
}

export interface DataApiResponse {
  success: boolean;
  message?: string;
  data?: DataPoint[];
}
