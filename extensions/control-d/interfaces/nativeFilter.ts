export interface ListFiltersResponse {
  body: Body;
  success: boolean;
}
interface Body {
  filters: FiltersItem[];
}
export interface FiltersItem {
  PK: string;
  name: string;
  description: string;
  additional?: string;
  sources: any[];
  options?: OptionsItem[];
  status: number;
}
interface OptionsItem {
  title: string;
  description: string;
  type: string;
  name: string;
  status: number;
}