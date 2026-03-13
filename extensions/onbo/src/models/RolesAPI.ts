/**
 * A single role listing as returned by the API.
 * Includes metadata like locations, source URL, category, and flags.
 */
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

/**
 * Paginated roles response envelope from the API.
 * - data: Array of RoleListing.
 * - page/limit/total/total_pages: Pagination metadata.
 */
export interface RolesAPI {
  data: RoleListing[];
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
