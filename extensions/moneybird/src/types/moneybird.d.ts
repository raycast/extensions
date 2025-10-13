export type MoneybirdProject = {
  id: string;
  name: string;
  customer_id: string;
};

export type MoneybirdUser = {
  id: string;
  name: string;
  email: string;
};

export type MoneybirdTimeEntry = {
  id?: string;
  description: string;
  started_at: string;
  ended_at: string;
  project_id: string;
  customer_id: string;
  user_id: string;
};

export type MoneybirdApiCustomer = {
  id: string;
  company_name: string | null;
  firstname: string | null;
  lastname: string | null;
  projects?: Array<{
    id: string;
    name: string;
    customer_id: string;
  }>;
};

export type MoneybirdApiProject = {
  id: string;
  name: string;
  customer_id: string;
  project_type?: string;
  state?: string;
};

export type MoneybirdAdministration = {
  id: string;
  name: string;
  language?: string;
  currency?: string;
  country?: string;
  time_zone?: string;
};
