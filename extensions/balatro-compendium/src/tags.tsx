import { List } from "@raycast/api";
import listData from "./tags.json";

export default function Command() {
  return (
    <List
      isLoading
      isShowingDetail
      navigationTitle="Tags"
      searchBarPlaceholder="Searching by Tag's name..."
    >
      {listData.map((item, index) => (
        <List.Item
          key={index}
          // icon={'🏷️' }
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

 ![](tags/${item.Appearance})

## Effect
${item.Effect}
`;
}
