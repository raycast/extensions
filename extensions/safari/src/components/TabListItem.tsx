import { ActionPanel, List } from "@raycast/api";
import { Tab } from "../types";
import { getTitle, getFaviconUrl, getTabUrl, getUrlDomain } from "../utils";
import CloseLocalTabAction from "./CloseLocalTabAction";
import CopyTabUrlAction from "./CopyTabUrlAction";
import OpenTabAction from "./OpenTabAction";

const Actions = (props: { tab: Tab; refresh: () => void }) => (
  <ActionPanel>
    <OpenTabAction tab={props.tab} />
    <CopyTabUrlAction tab={props.tab} />
    <CloseLocalTabAction tab={props.tab} refresh={props.refresh} />
  </ActionPanel>
);

const TabListItem = (props: { tab: Tab; refresh: () => void }) => {
  const url = getTabUrl(props.tab.url);
  const domain = getUrlDomain(url);

  return (
    <List.Item
      title={getTitle(props.tab)}
      accessoryTitle={domain}
      icon={getFaviconUrl(domain)}
      actions={<Actions tab={props.tab} refresh={props.refresh} />}
    />
  );
};

export default TabListItem;
