import { get } from "@/api/timecrowdClient";

export interface Category {
  id: number;
  title: string;
  color: number;
  team: {
    id: number;
    name: string;
  };
}

export const getCategories = async () => {
  return await get<Category[]>("/api/v1/categories");
};
