export type Project = {
  id: string;
  organization_id: string;
  name: string;
  region: string;
  created_at: string;
  status: string;
};

export type Branch = {
  id: string;
  name: string;
  project_ref: string;
  parent_project_ref: string;
  is_default: boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Organization = {
  id: string;
  name: string;
};
