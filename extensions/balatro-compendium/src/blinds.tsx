import { ActionPanel, List, Icon, Action } from "@raycast/api";
import { showToast, Toast } from "@raycast/api";
import listData from "./blinds.json";

export default function Command() {
  return (
    <List
      isLoading
      isShowingDetail
      navigationTitle="Blinds"
      searchBarPlaceholder="Searching by Blind name..."
    >
      {listData.map((item, index) => (
        <List.Item
          key={index}
          //  icon={'👑' }
          title={item.Name}
          subtitle={item.Effect}
          detail={<List.Item.Detail markdown={generateMarkdown(item)} />}
          actions={
            <ActionPanel>
              <Action
                title="How much to beat"
                icon={Icon.Trophy}
                onAction={() => {
                  showToast(Toast.Style.Success, `${item.Beat}`);
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
  Type: string;
}

function generateMarkdown(item: Item): string {
  return `
# ${item.Name}

 ![](blinds/${item.Appearance})

## Effect
${item.Effect}
## Type
${item.Type}
`;
}
