import { LocalStorage } from "@raycast/api";
import { Category } from "../types/category";

export default async function getCategories(): Promise<Category[]> {
  const categories = await LocalStorage.getItem<string>("categories");
  return categories ? JSON.parse(categories) : [];
}
