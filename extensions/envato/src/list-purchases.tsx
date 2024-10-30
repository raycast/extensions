import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { envato } from "./utils";

export default function ListPurchases() {
  const { isLoading, data: purchases } = useCachedPromise(
    async () => {
      const res = await envato.private.getPurchases({});
      return res.results;
    }, [], {
      initialData: []
    }
  )
  return (
    <List isLoading={isLoading}>
      {purchases.map((purchase) => (
        <List.Item
          key={purchase.code}
          icon={purchase.item.previews.icon_preview?.icon_url ?? Icon.Dot}
          title={purchase.item.name}
          // subtitle={item.subtitle}
          // accessories={[{ icon: Icon.Text, text: item.accessory }]}
          // actions={
          //   <ActionPanel>
          //     <Action.CopyToClipboard content={item.title} />
          //   </ActionPanel>
          // }
        />
      ))}
    </List>
  );
}
