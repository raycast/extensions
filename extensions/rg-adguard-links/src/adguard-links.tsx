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

  // Workaround for JSX typing incompatibilities in this workspace's React/TS types:
  const ListAny = List as unknown as any;
  const ListItem: any = (ListAny.Item as unknown) as any;

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
  const ActionPanelAny: any = ActionPanel as unknown as any;
  const ActionAny: any = Action as unknown as any;

  return (
    <ActionPanelAny>
      <ActionAny.OpenInBrowser title="Open Homepage" url={list.homepage} />
      <ActionAny.OpenInBrowser title="Open Raw" url={list.rawUrl} />
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
