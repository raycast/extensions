interface Parent {
  id: number;
  name: string;
}
export interface Collection {
  id: number;
  name: string;
  description: string;
  color: string;
  parentId: number | null;
  isPublic: boolean;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  parent: Parent | null;
  members: [];
  _count: {
    links: number;
  };
}

export interface Link {
  id: number;
  name: string;
  type: string;
  description: string;
  url: string;
  updatedAt: string;
  collection: {
    id: number;
    name: string;
    color: string;
  };
}

export interface Tag {
  id: number;
  name: string;
  ownerId: number;
}

export interface ApiResponse<T> {
  response: T;
}
