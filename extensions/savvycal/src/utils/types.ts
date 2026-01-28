export interface Preferences {
  SavvycalToken: string;
  personalSlug: string;
}

export interface SchedulingLink {
  default_duration?: string;
  description: string;
  durations: Array<number>;
  fields?: Array<string>;
  id: string;
  name: string;
  private_name: string;
  scope: {
    id: string;
    name: string;
    slug: string;
  };
  slug: string;
  state: string;
}

export type PaginatedList<T> = {
  entries: Array<T>;
  metadata: {
    after?: string;
    before?: string;
    limit: number;
  };
};
