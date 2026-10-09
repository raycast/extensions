import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { AddAliasForm } from "./add-alias";
import {
  addSkipRule,
  countPatternMatches,
  getRules,
  HisterError,
  removeAlias,
  removeRule,
  serverUrl,
  urlPatternQuery,
} from "./api";
import { CurrentTab, useCurrentTab } from "./lib/current-tab";
import { sitePattern } from "./lib/rules";

const rulesDocsUrl = "https://hister.org/docs/rules";

const groupTitles: Record<string, string> = {
  skip: "Not Indexed",
  allow: "Only Indexed",
  priority: "Ranked First",
  versioning: "Versions Kept",
};

async function countAll(patterns: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const queue = [...new Set(patterns.split("\n"))];
  const worker = async () => {
    for (let pattern = queue.shift(); pattern; pattern = queue.shift()) {
      counts[pattern] = await countPatternMatches(pattern).catch(() => NaN);
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, queue.length) }, worker));
  return counts;
}

function pages(count: number): string {
  return `${count.toLocaleString()} page${count === 1 ? "" : "s"}`;
}

export function RulesList({
  onSearch,
  initialView = "rules",
  startAddingAlias = false,
}: {
  onSearch: (query: string) => void;
  initialView?: "rules" | "aliases";
  startAddingAlias?: boolean;
}) {
  const { pop, push } = useNavigation();
  const [view, setView] = useState<string>(initialView);
  const tab = useCurrentTab();
  const {
    data: rules,
    isLoading,
    error,
    mutate,
    revalidate,
  } = useCachedPromise(getRules, [], { onError: () => undefined });
  const lists = Object.entries(rules?.lists ?? {}).filter(([, patterns]) => patterns.length);
  const aliases = Object.entries(rules?.aliases ?? {});
  // Joined so a refetch with the same rules doesn't count them all again.
  const patterns = lists.flatMap(([, list]) => list).join("\n");
  const { data: counts } = usePromise(countAll, [patterns], { execute: patterns.length > 0 });

  const addAliasAction = (
    <Action.Push
      title="Add Alias"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddAliasForm onDone={revalidate} />}
    />
  );

  const openInHister = (
    <Action.OpenInBrowser
      title="Open in Hister"
      url={`${serverUrl()}/rules`}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
  const openDocs = (url: string) => (
    <Action.OpenInBrowser
      title="Open Docs"
      icon={Icon.Book}
      url={url}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
    />
  );
  const aliasActions = (
    <ActionPanel.Section>
      {addAliasAction}
      {openInHister}
      {openDocs(`${rulesDocsUrl}#aliases`)}
    </ActionPanel.Section>
  );

  const tabPattern = tab && sitePattern(tab.url);
  const tabAdded = tabPattern !== undefined && (rules?.lists.skip ?? []).includes(tabPattern);

  const addSite = async (site: CurrentTab) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Adding ${site.host}` });
    try {
      const added = await mutate(addSkipRule(sitePattern(site.url)));
      toast.style = Toast.Style.Success;
      toast.title = added ? `Added ${site.host}` : `${site.host} is already added`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not add ${site.host}`;
      toast.message = error instanceof Error ? error.message : undefined;
    }
  };

  const addRuleActions = (
    <ActionPanel.Section>
      {tab && !tabAdded && (
        <Action
          title={`Add ${tab.host}`}
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => addSite(tab)}
        />
      )}
      {openInHister}
      {openDocs(rulesDocsUrl)}
    </ActionPanel.Section>
  );

  useEffect(() => {
    if (startAddingAlias) push(<AddAliasForm onDone={revalidate} />);
  }, []);

  const search = (query: string) => {
    onSearch(query);
    pop();
  };

  const confirmRemoval = async (title: string, remove: () => Promise<void>) => {
    const confirmed = await confirmAlert({
      title,
      icon: Icon.Trash,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Removing" });
    try {
      await mutate(remove());
      toast.style = Toast.Style.Success;
      toast.title = "Removed";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not remove";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  };

  const emptyView = error ? (
    <List.EmptyView
      icon={Icon.Warning}
      title={error instanceof HisterError ? error.title : "Something went wrong"}
      description={error.message}
    />
  ) : view === "aliases" ? (
    <List.EmptyView icon={Icon.TextCursor} title="No Aliases" actions={<ActionPanel>{aliasActions}</ActionPanel>} />
  ) : (
    <List.EmptyView icon={Icon.Filter} title="No Rules" actions={<ActionPanel>{addRuleActions}</ActionPanel>} />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={view === "aliases" ? "Aliases" : "Indexing Rules"}
      searchBarPlaceholder={view === "aliases" ? "Filter aliases" : "Filter rules"}
      searchBarAccessory={
        <List.Dropdown tooltip="Show" value={view} onChange={setView}>
          <List.Dropdown.Item title="Indexing Rules" value="rules" />
          <List.Dropdown.Item title="Aliases" value="aliases" />
        </List.Dropdown>
      }
    >
      {emptyView}
      {view === "rules" && tab && !tabAdded && (
        <List.Section title="Current Tab">
          <List.Item
            icon={tab.favicon ?? Icon.Globe}
            title={`Add ${tab.host}`}
            actions={<ActionPanel>{addRuleActions}</ActionPanel>}
          />
        </List.Section>
      )}
      {view === "rules" &&
        lists.map(([group, list]) => {
          const title = groupTitles[group] ?? group;
          return (
            <List.Section key={group} title={title}>
              {list.map((pattern) => {
                const count = counts?.[pattern];
                return (
                  <List.Item
                    key={pattern}
                    title={pattern}
                    accessories={
                      count === undefined || Number.isNaN(count)
                        ? []
                        : [{ text: pages(count), tooltip: "Indexed pages this rule matches" }]
                    }
                    actions={
                      <ActionPanel>
                        <Action
                          title="Search Matching Pages"
                          icon={Icon.MagnifyingGlass}
                          onAction={() => search(urlPatternQuery(pattern))}
                        />
                        <Action.CopyToClipboard
                          title="Copy Pattern"
                          content={pattern}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                        <Action
                          title="Remove Rule"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() =>
                            confirmRemoval(`Remove this ${title.toLowerCase()} rule?`, () => removeRule(group, pattern))
                          }
                        />
                        {addRuleActions}
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })}
      {view === "aliases" &&
        aliases.map(([keyword, value]) => (
          <List.Item
            key={keyword}
            title={keyword}
            subtitle={value}
            actions={
              <ActionPanel>
                <Action title="Search with Alias" icon={Icon.MagnifyingGlass} onAction={() => search(keyword)} />
                <Action.CopyToClipboard title="Copy Query" content={value} shortcut={Keyboard.Shortcut.Common.Copy} />
                <Action
                  title="Remove Alias"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => confirmRemoval(`Remove the "${keyword}" alias?`, () => removeAlias(keyword))}
                />
                {aliasActions}
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
