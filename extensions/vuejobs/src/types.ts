export type Response = {
  data: Jobs[];
};

export type Jobs = {
  slug: string;
  title: string;
  link: string;
  organization: Organization;
  remote: Remote;
  salary: Salary;
  taxonomies: Taxonomies;
  work_permit: string | null;
  locations: Locations[];
  published_at: string;
  description: string;
};

export type Organization = {
  avatar: string;
  name: string;
};

export type Remote = {
  timezones: string[];
  type: string | null;
};

export type Salary = {
  interval: string | null;
  from: number | null;
  to: number | null;
  currency: string | null;
};

export type Taxonomies = {
  work_type: string[];
  work_level: string[];
};

export type Locations = {
  name: string;
  city: string | null;
  state: State;
  country: Country;
};

export type State = {
  code: string;
  name: string;
};

export type Country = {
  code: string;
  name: string;
};

// WorkType
export type WorkType = {
  value: string;
  name: string;
}[];

// WorkLevel
export type WorkLevel = {
  value: string;
  name: string;
}[];
