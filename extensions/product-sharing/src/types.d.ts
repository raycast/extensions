declare type GetProduct = {
  id: string;
  url: string;
  title: string;
  type: string;
  description: string;
  cover: string;
  recommended: boolean;
  clicks: number;
  createdAt: Date;
  updatedAt: Date | null;
  score?: number;
};

declare type AddProduct = {
  url: string;
  title: string;
  type: string;
  description: string;
  cover: string;
  recommended: boolean;
  id?: string;
  clicks?: number;
  createdAt?: Date;
  updatedAt?: Date | null;
};
