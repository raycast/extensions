import { ActionPanel, List, Icon, Action } from "@raycast/api";
import { showToast, Toast } from "@raycast/api";
import listData from "./decks.json";

export default function Command() {
  return (
    <List
      isLoading
      isShowingDetail
      navigationTitle="Decks"
      searchBarPlaceholder="Searching by Deck name..."
    >
      {listData.map((item, index) => (
        <List.Item
          key={index}
          //  icon={'🎨' }
          title={item.Name}
          subtitle={item.Effect}
          detail={<List.Item.Detail markdown={generateMarkdown(item)} />}
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
        />
      ))}
    </List>
  );
}

interface Item {
  Name: string;
  Appearance: string;
  Effect: string;
  UnlockRequirement: string;
}

function generateMarkdown(item: Item): string {
  return `
# ${item.Name}

 ![](decks/${item.Appearance}?raycast-width=122&raycast-height=164)

## Effect
${item.Effect}
`;
}
