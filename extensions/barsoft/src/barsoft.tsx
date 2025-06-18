import { ActionPanel, List, Action, Icon } from "@raycast/api";

interface LinkItem {
  title: string;
  url: string;
}

interface Group {
  name: string;
  items: LinkItem[];
}

const groups: Group[] = [
  {
    name: "iPanel",
    items: [
      { title: "iPanel Dashboard", url: "https://www.barsoft.hu/ipanel/brand/dashboard" },
      { title: "iPanel POS", url: "https://www.barsoft.hu/ipanel/brand/devices/pos" },
      { title: "iPanel KIOSK", url: "https://www.barsoft.hu/ipanel/brand/devices/kiosk" },
      { title: "iPanel Asztalok", url: "https://www.barsoft.hu/ipanel/brand/tables" },
      { title: "iPanel Termékek", url: "https://www.barsoft.hu/ipanel/brand/catalog/menu-editor" },
      { title: "iPanel Termék elérhetőség", url: "https://www.barsoft.hu/ipanel/brand/catalog/item-availability" },
      {
        title: "iPanel Módosító elérhetőség",
        url: "https://www.barsoft.hu/ipanel/brand/catalog/modifier-availability",
      },
      { title: "iPanel Módosítók", url: "https://www.barsoft.hu/ipanel/brand/catalog/modifiers" },
      { title: "iPanel Lokációk", url: "https://www.barsoft.hu/ipanel/brand/locations" },
      { title: "iPanel Felhasználók", url: "https://www.barsoft.hu/ipanel/brand/users" },
    ],
  },
  {
    name: "Global",
    items: [
      { title: "Global", url: "https://www.barsoft.hu/global2/dashboard" },
      { title: "Brands", url: "https://www.barsoft.hu/global2/brands" },
      { title: "Dictionary", url: "https://www.barsoft.hu/global2/dictionary/global" },
      { title: "Registrations", url: "https://www.barsoft.hu/global2/registrations" },
    ],
  },
  {
    name: "Billing",
    items: [
      { title: "Billing", url: "https://www.barsoft.hu/billing2/dashboard" },
      { title: "Bills", url: "https://www.barsoft.hu/billing2/bills" },
    ],
  },
  {
    name: "Website",
    items: [{ title: "Homepage", url: "https://www.barsoft.hu" }],
  },
];

export default function Command() {
  return (
    <List>
      {groups.map((group) => (
        <List.Section title={group.name} key={group.name}>
          {group.items.map((item) => (
            <List.Item
              key={item.url}
              icon={Icon.Network}
              title={item.title}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open in Browser" url={item.url} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
