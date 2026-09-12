import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { showToast, Toast } from "@raycast/api";
import listData from "./vouchersplus.json";

export default function Command() {
  return (
    <List
      isLoading
      isShowingDetail
      navigationTitle="Vouchers+"
      searchBarPlaceholder="Searching by upgraded Voucher name..."
    >
      {listData.map((item, index) => (
        <List.Item
          key={index}
          //    icon={'💳' }
          title={item.Name}
          subtitle={item.Effect}
          detail={<List.Item.Detail markdown={generateMarkdown(item)} />}
          actions={
            <ActionPanel>
              <Action
                title="Downgrade"
                icon={Icon.Stars}
                onAction={() => {
                  showToast(
                    Toast.Style.Success,
                    "Downgraded Voucher:",
                    `${item.Downgrade}`,
                  );
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

 ![](vouchers/${item.Appearance}?raycast-width=108.56&raycast-height=171.12)

## Effect
${item.Effect}
`;
}
