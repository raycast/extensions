import { metadataFrom, type ItemCache, type ItemMetadataMap } from "./item-cache";
import { serializeItemReference, type ItemDetails, type ItemReference, type ItemSummary } from "./item";
type Source = {
  listItems(vaults: { name: string; shareId: string }[]): Promise<ItemSummary[]>;
  viewItem(item: ItemSummary): Promise<ItemDetails>;
  createLogin(input: {
    shareId: string;
    title: string;
    username?: string;
    email?: string;
    password?: string;
    url?: string;
  }): Promise<ItemSummary>;
  deleteItem(reference: ItemReference): Promise<void>;
  readField(reference: ItemReference, field: string): Promise<string>;
};
type Cache = { read(): Promise<ItemCache | undefined>; write(value: ItemCache): Promise<void> };
export function createItems(source: Source, cache: Cache) {
  return {
    getCached: () => cache.read(),
    async refresh(vaults: { name: string; shareId: string }[]) {
      const items = await source.listItems(vaults);
      const previous = await cache.read();
      const value = { items, metadata: previous?.metadata ?? {} };
      await cache.write(value);
      return value;
    },
    view: (item: ItemSummary) => source.viewItem(item),
    createLogin: source.createLogin,
    readField: source.readField,
    async remove(reference: ItemReference) {
      await source.deleteItem(reference);
      const current = await cache.read();
      if (!current) return;
      const key = serializeItemReference(reference);
      await cache.write({
        items: current.items.filter((item) => serializeItemReference(item) !== key),
        metadata: Object.fromEntries(Object.entries(current.metadata).filter(([entry]) => entry !== key)),
      });
    },
    async hydrate(items: ItemSummary[]): Promise<ItemMetadataMap> {
      const current = (await cache.read()) ?? { items, metadata: {} };
      const metadata = { ...current.metadata };
      const missing = items.filter((item) => metadata[serializeItemReference(item)]?.modifyTime !== item.modifyTime);
      for (let index = 0; index < missing.length; index += 6) {
        const results = await Promise.allSettled(
          missing.slice(index, index + 6).map(async (item) => ({ item, details: await source.viewItem(item) })),
        );
        for (const result of results)
          if (result.status === "fulfilled")
            metadata[serializeItemReference(result.value.item)] = metadataFrom(
              result.value.details,
              result.value.item.modifyTime,
            );
      }
      await cache.write({ items: current.items, metadata });
      return metadata;
    },
  };
}
export function getLoginIdentifier(details: ItemDetails) {
  return details.type === "login" ? details.username?.trim() || details.email?.trim() : details.email?.trim();
}
