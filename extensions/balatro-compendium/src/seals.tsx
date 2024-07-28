import { List } from "@raycast/api";
import listData from "./seals.json";

export default function Command() {
  return (
    <List
      isLoading
      isShowingDetail
      navigationTitle="Seals"
      searchBarPlaceholder="Searching by Seal's name..."
    >
      {listData.map((item, index) => (
        <List.Item
          key={index}
          //   icon={'🔏' }
          title={item.Name}
          subtitle={item.Effect}
          detail={<List.Item.Detail markdown={generateMarkdown(item)} />}
        />
      ))}
    </List>
  );
}

function generateMarkdown(item: any): string {
  return `
# ${item.Name}

 ![](seals/${item.Appearance}?raycast-width=122&raycast-height=164)

## Effect
${item.Effect}
`;
}
