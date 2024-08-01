import { List } from "@raycast/api";
import listData from "./enhancements.json";

export default function Command() {
  return (
    <List
      isLoading
      isShowingDetail
      navigationTitle="Enhancements"
      searchBarPlaceholder="Searching by Enhancement name..."
    >
      {listData.map((item, index) => (
        <List.Item
          key={index}
          //   icon={'✨' }
          title={item.Name}
          subtitle={item.Effect}
          detail={<List.Item.Detail markdown={generateMarkdown(item)} />}
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

 ![](enhancements/${item.Appearance}?raycast-width=122&raycast-height=164)

## Effect
${item.Effect}
`;
}
