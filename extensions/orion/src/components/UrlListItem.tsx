import { Action, ActionPanel, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { extractDomainName } from "../utils";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";
import OpenInOrionAction from "./OpenInOrionAction";

export type UrlItem = { title?: string; url: string };

const UrlListItem = (props: { item: UrlItem; accessory?: string; id?: string }) => {
  const { item, accessory, id } = props;
  return (
    <List.Item
      id={id}
      icon={getFavicon(item.url)}
      title={item.title || item.url}
      subtitle={extractDomainName(item.url)}
      accessories={accessory ? [{ text: accessory }] : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInOrionAction url={item.url} />
            <Action.OpenInBrowser title="Open in Default Browser" url={item.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyUrlAction url={item.url} />
            <CopyTitleAction title={item.title} />
            <CopyMarkdownLinkAction title={item.title} url={item.url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default UrlListItem;
