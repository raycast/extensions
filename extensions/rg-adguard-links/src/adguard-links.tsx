import { List, Icon, Action, ActionPanel, open, showToast, Toast, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { LISTS, AdguardList } from "./data/lists";

export default function AdguardLinks() {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<AdguardList[]>([]);

  useEffect(() => {
    // In future: fetch & cache external metadata; for now, use static list.
    setItems(LISTS);
    setIsLoading(false);
  }, []);

  // Lightweight typed aliases to avoid untyped `any` while keeping JSX usable.
  type RCComp = import("react").ComponentType<any>;
  const ListAny = List as unknown as RCComp & { Item: RCComp };
  const ListItem = ListAny.Item;

  return (
    <ListAny isLoading={isLoading} searchBarPlaceholder="Search AdGuard filter lists">
      {items.map((l) => (
        <ListItem
          key={l.id}
          title={l.name}
          subtitle={l.category}
          accessories={[{ icon: Icon.Link }]}
          actions={<Actions list={l} />}
        />
      ))}
    </ListAny>
  );
}

function Actions({ list }: { list: AdguardList }) {
  const ActionPanelAny = ActionPanel as unknown as import("react").ComponentType<any>;
  const ActionAny = Action as unknown as import("react").ComponentType<any>;

  return (
    <ActionPanelAny>
      <ActionAny title="Open Homepage" onAction={async () => { await open(list.homepage); }} />
      <ActionAny title="Open Raw" onAction={async () => { await open(list.rawUrl); }} />
      <ActionAny
        title="Copy Raw URL"
        icon={Icon.Clipboard}
        onAction={async () => {
          await Clipboard.copy(list.rawUrl);
          showToast({ style: Toast.Style.Success, title: "Copied raw URL" });
        }}
      />
    </ActionPanelAny>
  );
}
