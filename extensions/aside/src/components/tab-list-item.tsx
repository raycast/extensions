import { ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, type MutatePromise } from "@raycast/utils";
import type React from "react";
import type { Tab } from "../lib/types";
import {
  CloseTabAction,
  DuplicateTabAction,
  FocusTabAction,
  ManagedDeduplicateTabsAction,
  RefreshAction,
  UrlActions,
} from "./actions";

interface TabListItemProps {
  tab: Tab;
  mutate: MutatePromise<Tab[], undefined>;
  revalidate: () => Promise<unknown>;
  pendingCloseIdsRef: React.MutableRefObject<Set<string>>;
}

export function TabListItem({ tab, mutate, revalidate, pendingCloseIdsRef }: TabListItemProps) {
  const title = tab.title || tab.url;

  return (
    <List.Item
      icon={tab.favicon ?? getFavicon(tab.url, { fallback: Icon.Globe })}
      title={title}
      subtitle={tab.url}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <FocusTabAction tab={tab} />
            <DuplicateTabAction tab={tab} />
          </ActionPanel.Section>
          <UrlActions url={tab.url} title={title} />
          <ActionPanel.Section title="Tab">
            <CloseTabAction tab={tab} mutate={mutate} pendingCloseIdsRef={pendingCloseIdsRef} />
            <ManagedDeduplicateTabsAction
              mutate={mutate}
              revalidate={revalidate}
              pendingCloseIdsRef={pendingCloseIdsRef}
            />
            <RefreshAction subject="Tab List" revalidate={revalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
