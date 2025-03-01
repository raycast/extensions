import { Action, ActionPanel, List } from "@raycast/api";
import data from "./brands.json"; // ✅ Ensure this is correct

type Brand = {
  id: string;
  name: string;
  shopify: string;
  admin: string;
  portal: string;
};

export default function Command() {
  return (
    <List searchBarPlaceholder="Search for a brand...">
      {data.map((brand) => (
        <List.Item
          key={brand.id}
          title={brand.name}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Shopify" url={brand.shopify} />
              <Action.OpenInBrowser title="Open Admin" url={brand.admin} />
              <Action.OpenInBrowser title="Open Portal" url={brand.portal} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
