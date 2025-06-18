export interface Prompt {
  id?: string;
  title: string;
  content: string;
  description?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreatePromptRequest {
  title: string;
  content: string;
  description?: string;
  tags?: string[];
}
