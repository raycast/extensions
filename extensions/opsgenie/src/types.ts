export type ErrorResult = {
  message: string;
  took: number;
  requestId: string;
};

export type Alert = {
  id: string;
  message: string;
  status: string;
  acknowledged: boolean;
  snoozed: boolean;
  tags: string[];
  createdAt: string;
  priority: string;
};
export type Incident = {
  id: string;
  message: string;
  status: string;
  tags: string[];
  createdAt: string;
  priority: string;
};

export type Result = {
  result: string;
};
export type PaginatedResult<T> = {
  data: T[];
  paging:
    | Record<string, never>
    | {
        prev?: string;
        next?: string;
        first: string;
        last: string;
      };
};
