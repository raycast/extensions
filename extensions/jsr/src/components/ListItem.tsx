import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import type { SearchResultDocument } from "@/types";

import { compatIcons } from "@/lib/compat";
import preferences from "@/lib/preferences";

import CopyActions from "@/components/CopyActions";
import ItemDetails from "@/components/ItemDetails";

type ListItemProps = {
  item: SearchResultDocument;
  toggleDetails: () => void;
  isShowingDetails: boolean;
  extraActions: JSX.Element;
};

const ListItem = ({ item, toggleDetails, isShowingDetails, extraActions }: ListItemProps) => {
  const progress = item.score ?? 0;
  const iconColor = progress >= 80 ? Color.Green : progress >= 50 ? Color.Yellow : Color.Red;
  const icons = compatIcons(item);

  return (
    <List.Item
      id={`${item.scope}/${item.name}`}
      title={item.id}
      subtitle={item.description}
      accessories={
        isShowingDetails
          ? undefined
          : [...icons.map((ico) => ({ icon: ico.icon })), { tag: { value: `${progress}%`, color: iconColor } }]
      }
      detail={isShowingDetails ? <ItemDetails item={item} progress={progress} iconColor={iconColor} /> : null}
      actions={
        <ActionPanel>
          {preferences.openWebsiteByDefault ? (
            <>
              <Action.OpenInBrowser
                title="Open Main Page (JSR)"
                icon={{ source: "jsr.svg" }}
                url={`https://jsr.io/${item.id}`}
              />
              <Action title="Toggle Details" icon={Icon.AppWindowSidebarLeft} onAction={() => toggleDetails()} />
              <Action.OpenInBrowser
                title="Open Docs (JSR)"
                icon={{ source: "jsr.svg" }}
                url={`https://jsr.io/${item.id}/doc`}
                shortcut={{ key: "enter", modifiers: ["cmd", "shift"] }}
              />
              {extraActions}
            </>
          ) : (
            <>
              <Action title="Toggle Details" onAction={() => toggleDetails()} icon={Icon.AppWindowSidebarLeft} />
              <Action.OpenInBrowser
                title="Open Main Page (JSR)"
                icon={{ source: "jsr.svg" }}
                url={`https://jsr.io/${item.id}`}
              />
              <Action.OpenInBrowser
                title="Open Docs (JSR)"
                icon={{ source: "jsr.svg" }}
                url={`https://jsr.io/${item.id}/doc`}
                shortcut={{ key: "enter", modifiers: ["cmd", "shift"] }}
              />
              {extraActions}
            </>
          )}

          <CopyActions item={item} />
        </ActionPanel>
      }
    />
  );
};

export default ListItem;
