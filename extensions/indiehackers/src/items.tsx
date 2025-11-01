import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";

interface Item {
  title: string;
  link: string;
  contentSnippet: string;
  guid: string;
  categories: string[];
  isoDate: string;
}
export default function Items({ items, icon = "" }: { items: Item[]; icon?: string }) {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-details", false);
  return items.map((item) => (
    <List.Item
      key={item.guid}
      icon={icon || "indie-hackers.png"}
      title={item.title}
      accessories={
        isShowingDetail ? undefined : [...item.categories.map((tag) => ({ tag })), { date: new Date(item.isoDate) }]
      }
      detail={<List.Item.Detail markdown={`# ${item.title} \n\n ${item.contentSnippet}`} />}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.AppWindowSidebarLeft}
            title="Toggle Details"
            onAction={() => setIsShowingDetail((prev) => !prev)}
          />
          <Action.OpenInBrowser icon="indie-hackers.png" title="Read on Indiehackers" url={item.link} />
        </ActionPanel>
      }
    />
  ));
}
