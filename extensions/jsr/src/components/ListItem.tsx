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
};

const ListItem = ({ item, toggleDetails, isShowingDetails }: ListItemProps) => {
  const progress = item.score ?? 0;
  const iconColor = progress >= 80 ? Color.Green : progress >= 50 ? Color.Yellow : Color.Red;
  const icons = compatIcons(item);

  return (
    <List.Item
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
                title="Open in JSR"
                icon={{ source: "jsr.svg" }}
                url={`https://jsr.io/${item.id}`}
              />
              <Action
                title="Toggle Details"
                icon={Icon.AppWindowSidebarLeft}
                onAction={() => toggleDetails()}
                shortcut={{ key: "o", modifiers: ["cmd"] }}
              />
            </>
          ) : (
            <>
              <Action title="Toggle Details" onAction={() => toggleDetails()} icon={Icon.AppWindowSidebarLeft} />
              <Action.OpenInBrowser
                title="Open in JSR"
                icon={{ source: "jsr.svg" }}
                url={`https://jsr.io/${item.id}`}
                shortcut={{ key: "o", modifiers: ["cmd"] }}
              />
            </>
          )}

          <CopyActions item={item} />
        </ActionPanel>
      }
    />
  );
};

export default ListItem;
