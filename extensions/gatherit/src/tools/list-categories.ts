import { listCategories } from "../lib/api";

/** List the user's Gather categories with reference counts. */
export default async function tool() {
  const categories = await listCategories();
  return categories.map((c) => ({ id: c.id, name: c.name, count: c.count }));
}
