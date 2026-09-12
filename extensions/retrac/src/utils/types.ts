export type DomainResponse = {
  id: string;
  sku: string;
  description: string;
  cost: number;
  supplier: string;
  tagId: string;
  userId: string;
  projectId: string;
  transfers: number;
  createdAt: string;
  updatedAt: string;
  // TODO get accurate user type here
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
  };
};

export type Item = {
  id: string;
  sku: string;
  description: string;
  cost: number;
  supplier: string;
};
