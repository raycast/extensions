import { ActionPanel, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { extractDomainName } from "../utils";
import CopyMarkdownLinkAction from "./CopyMarkdownLinkAction";
import CopyTitleAction from "./CopyTitleAction";
import CopyUrlAction from "./CopyUrlAction";
import OpenInOrionAction from "./OpenInOrionAction";
import OpenInDefaultBrowserAction from "./OpenInDefaultBrowserAction";

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
            {/* UrlListItem only renders inside the Command Bar, so this always
                forces an immediate pop to root - see OpenTabAction. */}
            <OpenInOrionAction url={item.url} immediatePopToRoot />
            <OpenInDefaultBrowserAction url={item.url} immediatePopToRoot />
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
