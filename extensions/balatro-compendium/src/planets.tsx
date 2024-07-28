import { ActionPanel, List, Icon, Action } from "@raycast/api";
import listData from "./planets.json";

export default function Command() {
  return (
    <List
      isLoading
      isShowingDetail
      navigationTitle="Planets"
      searchBarPlaceholder="Searching by Planet name..."
    >
      {listData.map((item, index) => (
        <List.Item
          key={index}
          //   icon={'🌌' }
          title={item.Name}
          subtitle={item.HandType}
          detail={<List.Item.Detail markdown={generateMarkdown(item)} />}
        />
      ))}
    </List>
  );
}

function generateMarkdown(item: any): string {
  return `
# ${item.Name}

 ![](planets/${item.Appearance}?raycast-width=140.58&raycast-height=188.1)

## Effect
${item.Effect}
`;
}
