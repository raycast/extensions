import { getPreferenceValues } from "@raycast/api";

const { sort_order } = getPreferenceValues<Preferences.Projects>();
export function sortItems<T>(items: Array<T & { $updatedAt: string }>): Array<T> {
  return items.sort((a, b) => {
    switch (sort_order) {
      case "updated_at_asc":
        return new Date(a.$updatedAt).getTime() - new Date(b.$updatedAt).getTime();
      case "updated_at_des":
        return new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime();
      default:
        return 0;
    }
  });
}
