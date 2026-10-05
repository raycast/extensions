import { useCachedPromise } from "@raycast/utils";
import { buildSendyUrl, getActiveSubscriberCount, getBrands, getLists } from "./sendy";
import { Action, ActionPanel, Color, Grid, Icon, List } from "@raycast/api";
import { Item } from "./types";

export default function SearchBrands() {
  const { isLoading, data: brands } = useCachedPromise(getBrands);

  return (
    <Grid isLoading={isLoading}>
      {Object.values(brands ?? {}).map((brand) => (
        <Grid.Item
          key={brand.id}
          content={buildSendyUrl(`uploads/logos/${brand.id}.png`).toString()}
          title={brand.name}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.List} title="Search Lists" target={<SearchLists brand={brand} />} />
              <Action.OpenInBrowser url={buildSendyUrl(`app?i=${brand.id}`).toString()} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function SearchLists({ brand }: { brand: Item }) {
  const { isLoading, data: lists } = useCachedPromise(
    async (brandId: string) => {
      const data = await getLists(brandId);
      const listsWithCounts = await Promise.all(
        Object.values(data ?? {}).map(async (list) => {
          const active = await getActiveSubscriberCount(list.id);
          return { ...list, active };
        }),
      );
      return listsWithCounts;
    },
    [brand.id],
  );

  return (
    <List isLoading={isLoading}>
      {Object.values(lists ?? {}).map((list) => (
        <List.Item
          key={list.id}
          icon={Icon.List}
          title={list.name}
          accessories={[{ tag: { value: list.active.toString(), color: Color.Green }, tooltip: "Active" }]}
        />
      ))}
    </List>
  );
}
