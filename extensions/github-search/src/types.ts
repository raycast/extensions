export interface FormFields {
  assignee?: string;
  author?: string;
  comments?: string;
  excludeApps?: boolean;
  extension?: string;
  filename?: string;
  fork?: string;
  forks?: string;
  labels?: string;
  language?: string;
  mentions?: string;
  owner?: string;
  packageType?: string;
  path?: string;
  query?: string;
  reuseTab?: boolean;
  sort?: string;
  stars?: string;
  state?: string;
  type?: string;
  updated?: string;
  reusableFilterId?: string;
}

export interface SavedSearch extends FormFields {
  id: string;
  name: string;
}

export interface ReusableFilter {
  id: string;
  name: string;
  filter: string;
}

export interface ReusableFilterFormProps {
  reusableFilters: ReusableFilter[];
  onSelect: (reusableFilters: ReusableFilter[], reusableFilterId: string) => void;
  selectedFilter?: ReusableFilter;
}
