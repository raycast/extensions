import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { pathToFileURL } from "url";
import { favicon, OpenActions, spaceLabel, when } from "./components";
import { HistoryFilter, HistoryPage, pictureFile, searchHistory, SpaceInfo, spaceInfos } from "./data";
import { Tab } from "./yab";

/** The dropdown's choices: times first, then spaces. */
export function filterFor(choice: string): HistoryFilter {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const start = day.getTime() / 1000;
  switch (choice) {
    case "today":
      return { since: start };
    case "yesterday":
      return { since: start - 86400, until: start };
    case "week":
      return { since: start - 6 * 86400 };
    case "month":
      return { since: start - 29 * 86400 };
    case "all":
      return {};
    default:
      return choice.startsWith("space:") ? { space: choice.slice(6) } : {};
  }
}

export function HistoryDropdown({ onChange, spaces }: { onChange: (v: string) => void; spaces: SpaceInfo[] }) {
  return (
    <List.Dropdown tooltip="When and where" storeValue onChange={onChange}>
      <List.Dropdown.Item title="All Time" value="all" />
      <List.Dropdown.Item title="Today" value="today" />
      <List.Dropdown.Item title="Yesterday" value="yesterday" />
      <List.Dropdown.Item title="This Week" value="week" />
      <List.Dropdown.Item title="This Month" value="month" />
      {spaces.length > 1 ? (
        <List.Dropdown.Section title="Spaces">
          {spaces.map((s) => (
            <List.Dropdown.Item
              key={s.id}
              title={spaceLabel({ icon: s.icon, title: s.name })}
              value={`space:${s.id}`}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
    </List.Dropdown>
  );
}

export function useHistory(text: string, filter: HistoryFilter, execute = true) {
  return useCachedPromise((t: string, f: HistoryFilter) => searchHistory(t, f), [text, filter], {
    execute,
    keepPreviousData: true,
    failureToastOptions: { title: "Couldn't read Yab's history" },
  });
}

/** The passage with the words in bold, as Markdown. */
function passageMarkdown(passage: string): string {
  const escape = (s: string) => s.replace(/([*_`[\]#<>])/g, "\\$1");
  return escape(passage).replace(/⟦/g, "**").replace(/⟧/g, "**").replace(/\s+/g, " ").trim();
}

export function passageText(passage: string): string {
  return passage.replace(/[⟦⟧]/g, "").replace(/\s+/g, " ").trim();
}

export function HistoryItem(props: {
  page: HistoryPage;
  tabs?: Tab[];
  spaces: SpaceInfo[];
  showDetail: boolean;
  onSite?: (host: string) => void;
}) {
  const { page, tabs, spaces, showDetail } = props;
  const space = spaces.find((s) => s.id === page.space);
  const picture = showDetail ? pictureFile(page.key) : undefined;
  const md = [
    picture ? `![](${pathToFileURL(picture).href}?raycast-height=170)` : "",
    page.passage ? `> ${passageMarkdown(page.passage)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const domain = page.host.replace(/^www\./, "");
  const accessories: List.Item.Accessory[] = showDetail
    ? [{ text: when(page.last) }]
    : [
        ...(page.inPage ? [{ tag: { value: "in the page", color: Color.Yellow } }] : []),
        { text: when(page.last), tooltip: new Date(page.last * 1000).toLocaleString() },
      ];
  return (
    <List.Item
      id={page.key}
      icon={favicon(page.url)}
      title={page.title || domain}
      subtitle={showDetail ? undefined : { value: domain, tooltip: page.url }}
      accessories={accessories}
      detail={
        showDetail ? (
          <List.Item.Detail
            markdown={md || `**${page.title || domain}**`}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Link title="Address" text={domain} target={page.url} />
                <List.Item.Detail.Metadata.Label
                  title="Last Visit"
                  text={new Date(page.last * 1000).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                />
                <List.Item.Detail.Metadata.Label title="Visits" text={String(page.count)} />
                {space ? (
                  <List.Item.Detail.Metadata.Label
                    title="Space"
                    text={spaceLabel({ icon: space.icon, title: space.name })}
                  />
                ) : null}
                {page.thread ? (
                  <List.Item.Detail.Metadata.Label title="What You Were Doing" text={page.thread} />
                ) : null}
              </List.Item.Detail.Metadata>
            }
          />
        ) : undefined
      }
      actions={<HistoryActions page={page} tabs={tabs} onSite={props.onSite} />}
    />
  );
}

function HistoryActions({ page, tabs, onSite }: { page: HistoryPage; tabs?: Tab[]; onSite?: (host: string) => void }) {
  return (
    <ActionPanel>
      <OpenActions
        url={page.url}
        title={page.title}
        tabs={tabs}
        extra={
          <>
            {onSite ? (
              <Action
                title="Show Pages from This Site"
                icon={Icon.MagnifyingGlass}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={() => onSite(page.host)}
              />
            ) : null}
            {page.passage ? (
              <Action.CopyToClipboard
                title="Copy Passage"
                content={passageText(page.passage)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              />
            ) : null}
          </>
        }
      />
    </ActionPanel>
  );
}

export { spaceInfos };
