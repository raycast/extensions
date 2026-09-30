import { ActionPanel, List, Icon, Action } from "@raycast/api";
import { showToast, Toast } from "@raycast/api";
import listData from "./boosters.json";

export default function Command() {
  return (
    <List
      isLoading
      isShowingDetail
      navigationTitle="Boosters"
      searchBarPlaceholder="Searching by Booster's name..."
    >
      {listData.map((item, index) => (
        <List.Item
          key={index}
          //  icon={'🎴' }
          title={item.Name}
          //subtitle={item.Effect}
          detail={<List.Item.Detail markdown={generateMarkdown(item)} />}
          actions={
            <ActionPanel>
              <Action
                title="Cost"
                icon={Icon.Coins}
                onAction={() => {
                  const cost = item.Cost;
                  showToast({
                    title: "Cost",
                    message: cost,
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
}

function generateMarkdown(item: Item): string {
  return `
# ${item.Name}

 ![](boosters/${item.Appearance})




## Effect
${item.Effect}
`;
}
