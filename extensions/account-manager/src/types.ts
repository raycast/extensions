export interface Account {
  id: string;
  project: string;
  environment: string; // 從 Union Type 改為 string，允許任意輸入
  role: string;
  username: string;
  password?: string;
  notes?: string;
  url?: string;
}
