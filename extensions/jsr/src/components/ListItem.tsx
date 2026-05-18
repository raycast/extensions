import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";

import type { SearchResultDocument } from "@/types";

import { compatIcons } from "@/lib/compat";
import { jsrUrls } from "@/lib/jsrUrls";
import { scoreColor } from "@/lib/ui-helpers";

import CopyActions from "@/components/CopyActions";
import ItemDetails from "@/components/ItemDetails";
import Readme from "@/components/Readme";
import VersionList from "@/components/VersionList";
import { useSearchContext } from "@/context/SearchContext";

type ListItemProps = {
  item: SearchResultDocument;
};

const ListItem = ({ item }: ListItemProps) => {
  const { openWebsiteByDefault } = getPreferenceValues<Preferences>();
  const ctx = useSearchContext();
  const isShowingDetails = ctx?.isShowingDetails ?? false;
  const progress = item.score ?? 0;
  const iconColor = scoreColor(progress);
  const icons = compatIcons(item);

  return (
    <List.Item
      id={`${item.scope}/${item.name}`}
      title={item.id}
      subtitle={!isShowingDetails ? item.description : undefined}
      accessories={
        isShowingDetails
          ? undefined
          : [...icons.map((ico) => ({ icon: ico.icon })), { tag: { value: `${progress}%`, color: iconColor } }]
      }
      detail={isShowingDetails ? <ItemDetails item={item} /> : null}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Main">
            {openWebsiteByDefault ? (
              <>
                <Action.OpenInBrowser
                  title="Open Main Page (JSR)"
                  icon={{ source: "jsr.svg" }}
                  url={jsrUrls.site.package(item.id)}
                />
                <Action title="Toggle Details" icon={Icon.AppWindowSidebarLeft} onAction={() => ctx?.toggleDetails()} />
              </>
            ) : (
              <>
                <Action title="Toggle Details" onAction={() => ctx?.toggleDetails()} icon={Icon.AppWindowSidebarLeft} />
                <Action.OpenInBrowser
                  title="Open Main Page (JSR)"
                  icon={{ source: "jsr.svg" }}
                  url={jsrUrls.site.package(item.id)}
                />
              </>
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Other Actions">
            <Action.OpenInBrowser
              title="Open Docs (JSR)"
              icon={{ source: Icon.Document }}
              url={jsrUrls.site.packageDocs(item.id)}
              shortcut={{ key: "enter", modifiers: ["cmd", "shift"] }}
            />
            <Action.Push
              title="Show Readme"
              icon={Icon.Sidebar}
              target={<Readme item={item} />}
              shortcut={{ key: "d", modifiers: ["cmd", "shift"] }}
            />
            <Action.Push
              title="Show Versions"
              icon={{ source: Icon.List }}
              target={<VersionList scope={item.scope} name={item.name} />}
            />
            {ctx?.extraActions ? <>{ctx.extraActions}</> : null}
          </ActionPanel.Section>
          <CopyActions item={item} />
          {ctx?.searchQueryURL ? (
            <ActionPanel.Section title="Search">
              <Action.OpenInBrowser
                title="Open Search (JSR)"
                icon={{ source: "jsr.svg" }}
                url={ctx.searchQueryURL}
                shortcut={{ key: "w", modifiers: ["cmd", "shift"] }}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
};

export default ListItem;
