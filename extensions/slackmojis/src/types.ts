export type Slackmoji = {
  id: number;
  name: string;
  credit: string;
  created_at: string;
  updated_at: string;
  image_url: string;
  category: {
    id: number;
    name: string;
  };
};

export type ApiResult = {
  success: boolean;
  message?: string;
  emojis?: Slackmoji[];
};
