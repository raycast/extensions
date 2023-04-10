import { useEffect, useMemo } from "react";

import { getLinks } from "./data";
import { useStore } from "./store";

import {
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  List,
  OpenInBrowserAction,
  popToRoot,
  showToast,
  ToastStyle,
} from "@raycast/api";

export default function Rebrandly() {
  const { isLoading, links, pushLinks } = useStore();

  const lastId = useMemo(() => links[links.length - 1]?.id, [links]);

  // fetch more links on last item selection or manual action
  async function handleSelectionChange(selectedId = lastId) {
    if (links.length > 0 && selectedId == lastId) {
      const toast = await showToast(ToastStyle.Animated, "Fetching more links");
      const next = await getLinks(lastId);
      if (next.length > 0) {
        pushLinks(...next);
      }
      await toast.hide();
    }
  }

  // initial callback fetching first 25 shortlinks
  useEffect(() => {
    async function initial() {
      try {
        useStore.setState({ links: await getLinks() });
      } catch (error: unknown) {
        if (error instanceof Error) {
          await showToast(ToastStyle.Failure, "Failed fetching links", error.message);
          await popToRoot({ clearSearchBar: true });
        }
      }
      useStore.setState({ isLoading: false });
    }

    void initial();
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Browse shortlinks"
      searchBarPlaceholder="Search by title or slashtag"
      throttle
    >
      <List.Section title="Links">
        {links.map((link) => (
          <List.Item
            key={link.id}
            accessoryTitle={link.shortUrl}
            actions={
              <ActionPanel>
                <OpenInBrowserAction url={`${link.https ? "https" : "http"}://${link.shortUrl}`} />
                <CopyToClipboardAction content={`${link.https ? "https" : "http"}://${link.shortUrl}`} />
                <ActionPanel.Item
                  icon={{ source: Icon.ChevronDown }}
                  onAction={() => handleSelectionChange()}
                  title="Fetch more links"
                />
              </ActionPanel>
            }
            icon={{ source: Icon.Link }}
            id={link.id}
            keywords={[link.title, link.shortUrl, link.slashtag]}
            title={link.title.length > 48 ? `${link.title.substr(0, 48)}...` : link.title}
          />
        ))}
      </List.Section>

      <List.Section title="More Actions">
        {!isLoading && (
          <List.Item
            actions={
              <ActionPanel>
                <ActionPanel.Item
                  icon={{ source: Icon.ChevronDown }}
                  onAction={() => handleSelectionChange()}
                  title="Fetch more links"
                />
              </ActionPanel>
            }
            icon={{ source: Icon.ChevronDown }}
            title="Fetch more links"
          />
        )}
      </List.Section>
    </List>
  );
}
