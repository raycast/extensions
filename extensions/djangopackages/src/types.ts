export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CategorySummary {
  id: number;
  title: string;
  slug: string;
  description: string;
  title_plural: string;
  show_pypi: boolean;
}

export interface GridSummary {
  id: number;
  title: string;
  slug: string;
  description?: string;
  is_locked?: boolean;
  header?: boolean;
  packages?: string[];
  created?: string;
  modified?: string;
}

export interface SearchResponseItem {
  title: string;
  description: string;
  slug: string;
  absolute_url: string;
  category?: string;
  repo_watchers?: number;
  repo_forks?: number;
  pypi_downloads?: number;
  usage?: number;
  last_committed?: string;
  last_released?: string;
}

interface BasePackageDetail extends Omit<SearchResponseItem, "category"> {
  id: number;
  repo_url?: string;
  documentation_url?: string;
  pypi_url?: string;
  repo_description?: string;
  pypi_version?: string;
  last_updated?: string;
  last_fetched?: string;
  created?: string;
  modified?: string;
  participants?: string[];
  grids?: string[];
  category: string | CategorySummary | null;
}

export interface ApiPackageDetail extends Omit<BasePackageDetail, "participants"> {
  participants?: string[] | string;
}

export type PackageDetail = BasePackageDetail;
