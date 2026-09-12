type Flatten<T> = T extends Array<infer U> ? U : T;

export type PaginationOptions<T = unknown> = {
  page: number;
  lastItem?: Flatten<T>;
  cursor?: unknown;
};
