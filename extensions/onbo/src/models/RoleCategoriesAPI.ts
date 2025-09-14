export type RoleCategory = {
  name: string;
  total: number;
  active: number;
};

export interface RoleCategories {
  categories: RoleCategory[];
}
