export type Subscriber = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
};
export type CreateSubscriberRequest = {
  first_name: string;
  last_name: string;
  email: string;
};

export type Tag = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Template = {
  id: number;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
};
export type CreateTemplateRequest = {
  name: string;
  content: string;
};

export type PaginatedResult<T> = SuccessResult<T[]> & {
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | number;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
};
export type SuccessResult<T> = {
  data: T;
};
export type ErrorResult = {
  message: string;
  errors?: {
    [field: string]: string[];
  };
};
