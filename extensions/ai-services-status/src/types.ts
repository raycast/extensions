// 定义服务结构和状态响应接口
export interface Service {
  name: string;
  apiUrl: string;
  statusPageUrl: string;
  status?: string;
  lastUpdate?: string;
  items?: StatusItem[];
}

export interface StatusItem {
  id: string;
  name: string;
  status: string;
}

export interface StatusResponsePage {
  updated_at?: string;
}

export interface StatusResponseStatus {
  description?: string;
}

export interface StatusResponse {
  status?: StatusResponseStatus;
  page?: StatusResponsePage;
}
