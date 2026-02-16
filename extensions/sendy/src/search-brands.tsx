import { useCachedPromise } from "@raycast/utils";
import { buildSendyUrl, getBrands, getLists } from "./sendy";
import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import { Item } from "./types";

export default function SearchBrands() {
  const {isLoading, data:brands} = useCachedPromise(getBrands);

  return <Grid isLoading={isLoading}>
    {Object.values(brands ?? {}).map(brand => <Grid.Item key={brand.id} content={buildSendyUrl(`uploads/logos/${brand.id}.png`).toString()} title={brand.name} actions={<ActionPanel>
      <Action.Push icon={Icon.List} title="Search Lists" target={<SearchLists brand={brand} />} />
    </ActionPanel>} />)}
  </Grid>
}

function SearchLists({brand}: {brand: Item}) {
  const {isLoading, data: lists} = useCachedPromise(getLists, [brand.id])
  return <List isLoading={isLoading}>
    {Object.values(lists ?? {}).map(list => <List.Item key={list.id} icon={Icon.List} title={list.name} />)}
  </List>
}