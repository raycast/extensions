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
  onSearchTextChange,
  onAddAction,
  onRemoveAction,
  DropdownComponent,
  purchaseStyle,
}: {
  list: BringListInfo;
  sections: Section[];
  searchText: string;
  isLoading: boolean;
  onSearchTextChange: (text: string) => void;
  onAddAction: (item: Item, specification?: string) => void;
  onRemoveAction: (item: Item) => void;
  DropdownComponent: () => JSX.Element;
  purchaseStyle: string;
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
          <ActionPanel title={list.name}>
            {!isInPurchaseList ? (
              <Action title="Add to List" onAction={() => onAddAction(item)} icon={Icon.Plus} />
            ) : (
              <Action title="Remove from List" onAction={() => onRemoveAction(item)} icon={Icon.Minus} />
            )}
          </ActionPanel>
        }
      />
    );
  }

  const addedItems = sections.flatMap((section) => section.items.filter((item) => item.isInPurchaseList));

  const addedSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.isInPurchaseList),
    }))
    .filter((section) => section.items.length > 0);

  const renderAddedItems = () => {
    if (purchaseStyle === "grouped") {
      return addedSections.map(({ sectionId, name: sectionName, items }) => (
        <Grid.Section key={sectionId} title={sectionName}>
          {items.map((item) => getGridItem(item, [sectionName]))}
        </Grid.Section>
      ));
    } else {
      return addedItems.map((item) => getGridItem(item));
    }
  };

  return (
    <Grid
      columns={6}
      searchText={searchText}
      searchBarPlaceholder="I need"
      onSearchTextChange={onSearchTextChange}
      navigationTitle={`Add Items to ${list.name}`}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      filtering={true}
      searchBarAccessory={DropdownComponent()}
    >
      {searchText.length === 0 ? (
        addedItems.length > 0 ? (
          renderAddedItems()
        ) : (
          <Grid.EmptyView
            icon={Icon.CheckList}
            title="No items added"
            description="Search for items to add to your list"
          />
        )
      ) : (
        sections.map(({ sectionId, name: sectionName, items }) => (
          <Grid.Section key={sectionId} title={sectionName}>
            {items.map((item) => getGridItem(item, [sectionName]))}
          </Grid.Section>
        ))
      )}
    </Grid>
  );
};
