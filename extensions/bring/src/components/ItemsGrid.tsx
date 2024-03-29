import { Action, ActionPanel, Color, Grid, Icon } from "@raycast/api";
import { BringListInfo } from "../lib/bringAPI";

export interface Section {
  name: string;
  sectionId: string;
  items: Item[];
}

export interface Item {
  itemId: string;
  name: string;
  image: string;
  fallback: string;
  isInPurchaseList: boolean;
  specification?: string;
}

const ColorBringRed = "rgb(238, 82, 79)";
const ColorBringGreen = "rgb(79, 171, 162)";

export const ItemsGrid = ({
  list,
  sections,
  searchText,
  isLoading,
  showAddedItemsOnTop,
  onSearchTextChange,
  onAddAction,
  onRemoveAction,
  DropdownComponent,
}: {
  list: BringListInfo;
  sections: Section[];
  searchText: string;
  isLoading: boolean;
  showAddedItemsOnTop: boolean;
  onSearchTextChange: (text: string) => void;
  onAddAction: (item: Item, specification?: string) => void;
  onRemoveAction: (item: Item) => void;
  DropdownComponent: () => JSX.Element;
}) => {
  function getGridItem(item: Item, keywords?: string[]): JSX.Element {
    const { itemId, name, image, fallback, isInPurchaseList, specification } = item;
    return (
      <Grid.Item
        key={itemId}
        content={{
          value: { source: image, fallback, tintColor: Color.PrimaryText },
          tooltip: name,
        }}
        keywords={keywords}
        title={name}
        subtitle={specification}
        accessory={{
          icon: { source: Icon.CircleFilled, tintColor: isInPurchaseList ? ColorBringRed : ColorBringGreen },
        }}
        actions={
          <ActionPanel title="Bring!">
            {!isInPurchaseList ? (
              <Action
                title="Add to List"
                onAction={() => onAddAction(item)}
                icon={{ source: Icon.PlusCircle, tintColor: Color.Green }}
              />
            ) : (
              <Action
                title="Remove from List"
                onAction={() => onRemoveAction(item)}
                icon={{ source: Icon.MinusCircle, tintColor: Color.Red }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  function getAddedItems(sections: Section[]): Item[] {
    return sections
      .reduce((acc, value) => acc.concat(value.items), [] as Item[])
      .filter((item) => item.isInPurchaseList);
  }

  return (
    <Grid
      columns={5}
      aspectRatio="4/3"
      searchText={searchText}
      searchBarPlaceholder="I need"
      onSearchTextChange={onSearchTextChange}
      navigationTitle={`Add Items to ${list.name}`}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      filtering={true}
      searchBarAccessory={DropdownComponent()}
    >
      {showAddedItemsOnTop && getAddedItems(sections).map((item) => getGridItem(item))}
      {sections.map(({ sectionId, name: sectionName, items }) => (
        <Grid.Section key={sectionId} title={sectionName}>
          {items.map((item) => getGridItem(item, [sectionName]))}
        </Grid.Section>
      ))}
    </Grid>
  );
};
