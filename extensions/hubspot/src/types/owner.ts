export interface Data {
  results: Owner[];
  paging?: Paging;
}

export interface Owner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}

export interface Paging {
  next?: Next;
}

export interface Next {
  after: string;
  link: string;
}
