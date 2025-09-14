export type RoleListing = {
  id: number;
  company: string;
  role: string;
  locations: string[];
  application_url: string;
  category: string;
  flags: string[];
  is_active: boolean;
  posted_date: string;
  days_ago: number;
};

export interface RolesAPI {
  data: RoleListing[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
