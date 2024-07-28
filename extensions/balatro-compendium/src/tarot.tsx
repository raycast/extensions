import { List } from "@raycast/api";
import listData from "./tarot.json";

export default function Command() {
  return (
    <List
      isLoading
      isShowingDetail
      navigationTitle="Tarot Cards"
      searchBarPlaceholder="Searching by Tarot name..."
    >
      {listData.map((item, index) => (
        <List.Item
          key={index}
          //  icon={'🔮' }
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

 ![](tarot/${item.Appearance}?raycast-width=122&raycast-height=164)

## Effect
${item.Effect}
`;
}
