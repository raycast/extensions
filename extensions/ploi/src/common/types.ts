type MetaLink = {
  url: string | null;
  label: string;
  active: boolean;
};
export type PaginatedResponse<T> = {
  data: T[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    links?: MetaLink[];
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
};
