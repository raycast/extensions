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

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search AdGuard filter lists">
      {items.map((l) => (
        <List.Item
          key={l.id}
            title={l.name}
            subtitle={l.category}
            accessories={[{ icon: Icon.Link }]}            
            actions={<Actions list={l} />}
        />
      ))}
    </List>
  );
}

function Actions({ list }: { list: AdguardList }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Homepage" url={list.homepage} />
      <Action.OpenInBrowser title="Open Raw" url={list.rawUrl} />
      <Action
        title="Copy Raw URL"
        icon={Icon.Clipboard}
        onAction={async () => {
          await Clipboard.copy(list.rawUrl);
          showToast({ style: Toast.Style.Success, title: "Copied raw URL" });
        }}
      />
    </ActionPanel>
  );
}
