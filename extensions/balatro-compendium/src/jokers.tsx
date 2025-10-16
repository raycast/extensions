import { ActionPanel, Detail, Icon, List, Action } from "@raycast/api";
import { showToast, Toast } from "@raycast/api";
import listData from "./jokers.json";

const rarityColors: { [key: string]: string } = {
  Common: "#0093FF",
  Uncommon: "#35BD86",
  Rare: "#FF4B40",
  Legendary: "#AB5BB5",
};

export default function Command() {
  return (
    <List
      throttle={true}
      isLoading
      isShowingDetail
      navigationTitle="Jokers"
      searchBarPlaceholder="Searching by Joker's name..."
    >
      {listData.map((item, index) => (
        <List.Item
          key={index}
          // icon={'🃏' }
          title={item.Name}
          subtitle={item.Effect}
          detail={<List.Item.Detail markdown={generateMarkdown(item)} />}
          actions={
            <ActionPanel>
              <Action.Push
                title={item.Name}
                icon={Icon.Info}
                target={<ItemDetail item={item} />}
              />
              <Action
                title="Unlock Requirement"
                icon={Icon.LockUnlocked}
                onAction={() => {
                  const unlockRequirement = item.UnlockRequirement;
                  showToast({
                    title: "Unlock Requirement",
                    message: unlockRequirement,
                    style: Toast.Style.Success,
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface Item {
  Name: string;
  Appearance: string;
  Effect: string;
  Rarity: string;
  UnlockRequirement: string;
  Cost: string;
}

function generateMarkdown(item: Item): string {
  return `
# ${item.Name}

 ![](jokers/${item.Appearance}?raycast-width=122)

## Effect
${item.Effect}
`;
}

function ItemDetail({ item }: { item: Item }) {
  const rarity = item.Rarity;
  const color = rarityColors[rarity] || "#000000";
  //const unlockRequirement =item.UnlockRequirement;
  //Spoiler Shield
  //showToast({ title: "Unlock Requirement", message: unlockRequirement, style: Toast.Style.Success });

  return (
    <Detail
      markdown={`

![](jokers/${item.Appearance}?raycast-width=163.3&raycast-height=218.5)
## Effect
${item.Effect}
`}
      actions={
        <ActionPanel>
          <Action
            title="Unlock"
            icon={Icon.LockUnlocked}
            onAction={() => {
              const unlockRequirement = item.UnlockRequirement;
              showToast({
                title: "Unlock Requirement",
                message: unlockRequirement,
                style: Toast.Style.Success,
              });
            }}
          />
        </ActionPanel>
      }
      navigationTitle={item.Name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Rarity">
            <Detail.Metadata.TagList.Item text={rarity} color={color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Cost">
            <Detail.Metadata.TagList.Item text={item.Cost} color={"#eed535"} />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
