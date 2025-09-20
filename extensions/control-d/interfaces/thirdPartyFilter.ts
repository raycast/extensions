export interface ListThirdPartyFiltersResponse {
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
  additional: string;
  sources: string[];
  resolvers: Resolvers;
  status: number;
}
interface Resolvers {
  v4: string[];
  v6: string[];
}
