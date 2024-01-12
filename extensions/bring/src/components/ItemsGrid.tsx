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
  canSwitchList,
  onSearchTextChange,
  onAddAction,
  onRemoveAction,
  onResetList,
}: {
  list: BringListInfo;
  sections: Section[];
  searchText: string;
  isLoading: boolean;
  showAddedItemsOnTop: boolean;
  canSwitchList: boolean;
  onSearchTextChange: (text: string) => void;
  onAddAction: (item: Item, specification?: string) => void;
  onRemoveAction: (item: Item) => void;
  onResetList: () => void;
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
              <ActionPanel.Section>
                <Action title="Add to List" onAction={() => onAddAction(item)} />
                {/* <Action title="Add to List with Specification" onAction={() => addWithSpecification(name)} /> */}
              </ActionPanel.Section>
            ) : (
              <ActionPanel.Section>
                <Action title="Remove from List" onAction={() => onRemoveAction(item)} />
                {/* <Action title="Edit Specification" onAction={() => addWithSpecification(name)} /> */}
              </ActionPanel.Section>
            )}
            {canSwitchList && (
              <Action
                title="Switch to Another List"
                onAction={onResetList}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
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
      searchText={searchText}
      searchBarPlaceholder="What would you like to add?"
      onSearchTextChange={onSearchTextChange}
      navigationTitle={`Add Items to ${list.name}`}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      filtering={true}
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
