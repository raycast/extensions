import { DomainListItem } from "../types/nextdns";
import { toggleSite } from "./api";

//TODO: FIX any
export async function removeItem(element: DomainListItem, mutate: (data: any, options?: any) => Promise<void>) {
  await mutate(toggleSite({ element }), {
    optimisticUpdate(data: { [key: string]: DomainListItem[] } | undefined) {
      if (!data) {
        return {};
      }

      const updatedData = { ...data };
      const list = updatedData.result || [];
      const index = list.findIndex((item) => item.id === element.id);

      if (index !== -1) {
        list[index] = { ...list[index], active: !list[index].active };
      }

      return updatedData;
    },
  });
}
