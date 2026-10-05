import { useCachedPromise } from "@raycast/utils";
import { homebox } from "./homebox";

export function useItem(id: string) {
  const { data, ...rest } = useCachedPromise(async (id: string) => await homebox.items.get(id), [id]);
  return {
    item: data,
    ...rest,
  };
}
export function useItemMaintenanceLog(id: string) {
  const { data, ...rest } = useCachedPromise(async () => await homebox.items.getMaintenanceLog(id));
  return {
    maintenance: data,
    ...rest,
  };
}

export function useItems(query: string) {
  const { data, ...rest } = useCachedPromise(
    (query: string) => async (options) => {
      const result = await homebox.items.search({ query, page: options.page + 1 });
      return {
        data: result.items,
        hasMore: result.page * result.pageSize < result.total,
      };
    },
    [query],
    {
      initialData: [],
    },
  );
  return {
    items: data,
    ...rest,
  };
}

export function useLabels() {
  const { data, ...rest } = useCachedPromise(homebox.labels.list, [], { initialData: [] });
  return {
    labels: data,
    ...rest,
  };
}
export function useLocations() {
  const { data, ...rest } = useCachedPromise(homebox.locations.list, [], { initialData: [] });
  return {
    locations: data,
    ...rest,
  };
}
