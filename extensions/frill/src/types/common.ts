export type Author = {
  name: string;
  email: string;
  avatar: string;
  created_at: string;
  updated_at: string;
  idx: string;
};

export type BaseSuccessResponse = {
  meta: [];
  pagination?: {
    total: number;
    count: number;
    hasNextPage: boolean;
    startCursor: string;
    endCursor: string;
  };
};
