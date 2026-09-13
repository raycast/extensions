import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactNode, useState } from "react";
import { KIND_COLOR, KIND_ICON } from "../lib/appearance";
import { DocDetails, loadDetails } from "../lib/docpage";
import { PrimaryAction } from "../lib/preferences";
import { EntryIndex, membersOf } from "../lib/search";
import {
  boilerplate,
  importStatement,
  markdownLink,
  sourceSearchUrl,
} from "../lib/snippets";
import { DocEntry, KIND_LABELS, MetaIndex, SECTIONS } from "../lib/types";

export interface ViewContext {
  entries: DocEntry[];
  index: EntryIndex;
  meta: MetaIndex;
  favorites: string[];
  toggleFavorite: (name: string) => void;
  addRecent: (name: string) => void;
  primaryAction: PrimaryAction;
  showDetail: boolean;
  toggleDetail: () => void;
}

export interface EntrySection {
  title: string;
  subtitle?: string;
  entries: DocEntry[];
}

function sectionTitle(entry: DocEntry): string {
  return (
    SECTIONS.find((section) => section.id === entry.section)?.title ??
    entry.section
  );
}

function intentNotice(intents: string[] | undefined): string | null {
  if (!intents?.length) return null;
  const list = intents.map((intent) => `\`Intents.${intent}\``).join(", ");
  return `> ⚠️ **Requires ${list}** to be enabled, otherwise this will silently never fire or stay empty.`;
}

function detailMarkdown(
  entry: DocEntry,
  details: DocDetails | undefined,
  meta: MetaIndex,
): string {
  const notice = intentNotice(meta[entry.anchor]?.intents);
  const signature = details?.signature
    ? `\`\`\`python\n${details.signature}\n\`\`\``
    : "";
  return [`# ${entry.display}`, notice, signature, details?.markdown ?? ""]
    .filter(Boolean)
    .join("\n\n");
}

export function entryAccessories(
  entry: DocEntry,
  ctx: ViewContext,
): List.Item.Accessory[] {
  const meta = ctx.meta[entry.anchor];
  const accessories: List.Item.Accessory[] = [];

  if (meta?.coroutine)
    accessories.push({ tag: { value: "await", color: Color.Blue } });
  if (meta?.intents?.length) {
    accessories.push({
      tag: { value: `intent: ${meta.intents.join(", ")}`, color: Color.Yellow },
    });
  }
  accessories.push({
    tag: { value: KIND_LABELS[entry.kind], color: KIND_COLOR[entry.kind] },
  });
  if (ctx.favorites.includes(entry.name)) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }

  return accessories;
}

function EntryActions({
  entry,
  ctx,
  details,
  extra,
}: {
  entry: DocEntry;
  ctx: ViewContext;
  details?: DocDetails;
  extra?: ReactNode;
}) {
  const { push } = useNavigation();
  const members =
    entry.kind === "class" || entry.kind === "exception"
      ? membersOf(ctx.index, entry)
      : [];
  const references = (details?.references ?? [])
    .map((name) => ctx.index.byName.get(name))
    .filter(
      (candidate): candidate is DocEntry =>
        Boolean(candidate) && candidate?.name !== entry.name,
    );
  const snippet = boilerplate(entry, details);
  const sourceUrl = sourceSearchUrl(entry);
  const importLine = importStatement(entry);
  const isFavorite = ctx.favorites.includes(entry.name);

  const showDetails = (
    <Action
      title="Show Details"
      icon={Icon.Sidebar}
      onAction={() => {
        ctx.addRecent(entry.name);
        push(<EntryDetail entry={entry} ctx={ctx} />);
      }}
    />
  );
  const openInBrowser = (
    <Action.OpenInBrowser
      url={entry.url}
      shortcut={Keyboard.Shortcut.Common.Open}
      onOpen={() => ctx.addRecent(entry.name)}
    />
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {ctx.primaryAction === "browser" ? openInBrowser : showDetails}
        {ctx.primaryAction === "browser" ? showDetails : openInBrowser}
        {members.length > 0 ? (
          <Action
            title={`Show ${members.length} Members`}
            icon={Icon.BulletPoints}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            onAction={() => push(<MemberList parent={entry} ctx={ctx} />)}
          />
        ) : null}
        {references.length > 0 ? (
          <Action
            title={`Show ${references.length} Referenced Entries`}
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() =>
              push(
                <ReferenceList
                  parent={entry}
                  references={references}
                  ctx={ctx}
                />,
              )
            }
          />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section>
        {snippet && (
          <Action.CopyToClipboard
            title="Copy Boilerplate"
            content={snippet}
            icon={Icon.CodeBlock}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        )}
        {details?.example && (
          <Action.CopyToClipboard
            title="Copy Example Code"
            content={details.example}
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          />
        )}
        {importLine && (
          <Action.CopyToClipboard
            title="Copy Import Statement"
            content={importLine}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
        )}
        {details?.signature && (
          <Action.CopyToClipboard
            title="Copy Signature"
            content={details.signature}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
          />
        )}
        <Action.CopyToClipboard
          title="Copy Qualified Name"
          content={entry.name}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <Action.CopyToClipboard
          title="Copy Markdown Link"
          content={markdownLink(entry)}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
        <Action.CopyToClipboard
          title="Copy Documentation URL"
          content={entry.url}
          shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
        />
        {sourceUrl ? (
          <Action.OpenInBrowser
            title="Search Source on GitHub"
            url={sourceUrl}
            icon={Icon.Code}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={isFavorite ? Icon.StarDisabled : Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => ctx.toggleFavorite(entry.name)}
        />
        <Action
          title={ctx.showDetail ? "Hide Preview" : "Show Preview"}
          icon={Icon.AppWindowSidebarLeft}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={ctx.toggleDetail}
        />
      </ActionPanel.Section>

      {extra}
    </ActionPanel>
  );
}

export function EntryListView({
  ctx,
  sections,
  isLoading,
  navigationTitle,
  searchBarPlaceholder,
  searchBarAccessory,
  onSearchTextChange,
  filtering,
  emptyTitle,
  emptyDescription,
  extraActions,
}: {
  ctx: ViewContext;
  sections: EntrySection[];
  isLoading?: boolean;
  navigationTitle?: string;
  searchBarPlaceholder: string;
  searchBarAccessory?: ReactNode;
  onSearchTextChange?: (text: string) => void;
  filtering?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  extraActions?: ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedEntry = sections
    .flatMap((section) => section.entries)
    .find((entry) => entry.name === selected);

  const { data: details } = usePromise(
    async (entry?: DocEntry) => (entry ? loadDetails(entry) : undefined),
    [selectedEntry],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={ctx.showDetail && Boolean(selectedEntry)}
      navigationTitle={navigationTitle}
      filtering={filtering}
      throttle
      onSearchTextChange={onSearchTextChange}
      onSelectionChange={setSelected}
      searchBarPlaceholder={searchBarPlaceholder}
      searchBarAccessory={
        searchBarAccessory as List.Props["searchBarAccessory"]
      }
      actions={
        extraActions ? <ActionPanel>{extraActions}</ActionPanel> : undefined
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={emptyTitle}
        description={emptyDescription}
      />
      {sections.map((section) => (
        <List.Section
          key={section.title}
          title={section.title}
          subtitle={section.subtitle}
        >
          {section.entries.map((entry) => (
            <List.Item
              key={entry.name}
              id={entry.name}
              icon={{
                source: KIND_ICON[entry.kind],
                tintColor: KIND_COLOR[entry.kind],
              }}
              title={entry.display}
              subtitle={ctx.showDetail ? undefined : entry.module}
              accessories={
                ctx.showDetail ? undefined : entryAccessories(entry, ctx)
              }
              detail={
                entry.name === selected ? (
                  <List.Item.Detail
                    markdown={detailMarkdown(entry, details, ctx.meta)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Kind"
                          text={KIND_LABELS[entry.kind]}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Section"
                          text={sectionTitle(entry)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Qualified Name"
                          text={entry.name}
                        />
                        {ctx.meta[entry.anchor]?.coroutine && (
                          <List.Item.Detail.Metadata.Label
                            title="Coroutine"
                            text="Must be awaited"
                          />
                        )}
                        {ctx.meta[entry.anchor]?.intents?.length ? (
                          <List.Item.Detail.Metadata.Label
                            title="Required Intents"
                            text={ctx.meta[entry.anchor].intents?.join(", ")}
                          />
                        ) : null}
                      </List.Item.Detail.Metadata>
                    }
                  />
                ) : undefined
              }
              actions={
                <EntryActions
                  entry={entry}
                  ctx={ctx}
                  details={entry.name === selected ? details : undefined}
                  extra={
                    extraActions ? (
                      <ActionPanel.Section>{extraActions}</ActionPanel.Section>
                    ) : undefined
                  }
                />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export function MemberList({
  parent,
  ctx,
}: {
  parent: DocEntry;
  ctx: ViewContext;
}) {
  const members = membersOf(ctx.index, parent);

  return (
    <EntryListView
      ctx={ctx}
      navigationTitle={parent.display}
      searchBarPlaceholder={`Search members of ${parent.display}`}
      emptyTitle="No matching members"
      sections={[
        {
          title: parent.display,
          subtitle: `${members.length} members`,
          entries: members,
        },
      ]}
    />
  );
}

export function ReferenceList({
  parent,
  references,
  ctx,
}: {
  parent: DocEntry;
  references: DocEntry[];
  ctx: ViewContext;
}) {
  return (
    <EntryListView
      ctx={ctx}
      navigationTitle={`Referenced by ${parent.display}`}
      searchBarPlaceholder={`Search entries referenced by ${parent.display}`}
      emptyTitle="No referenced entries"
      sections={[
        {
          title: "Referenced Entries",
          subtitle: `${references.length}`,
          entries: references,
        },
      ]}
    />
  );
}

export function EntryDetail({
  entry,
  ctx,
}: {
  entry: DocEntry;
  ctx: ViewContext;
}) {
  const { data: details, isLoading } = usePromise(loadDetails, [entry]);
  const meta = ctx.meta[entry.anchor];

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={entry.display}
      markdown={detailMarkdown(entry, details, ctx.meta)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Kind">
            <Detail.Metadata.TagList.Item
              text={KIND_LABELS[entry.kind]}
              color={KIND_COLOR[entry.kind]}
            />
            {meta?.coroutine && (
              <Detail.Metadata.TagList.Item text="await" color={Color.Blue} />
            )}
          </Detail.Metadata.TagList>
          {meta?.intents?.length ? (
            <Detail.Metadata.TagList title="Required Intents">
              {meta.intents.map((intent) => (
                <Detail.Metadata.TagList.Item
                  key={intent}
                  text={`Intents.${intent}`}
                  color={Color.Yellow}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Label title="Section" text={sectionTitle(entry)} />
          <Detail.Metadata.Label title="Qualified Name" text={entry.name} />
          <Detail.Metadata.Link
            title="Documentation"
            target={entry.url}
            text="Open on readthedocs"
          />
        </Detail.Metadata>
      }
      actions={<EntryActions entry={entry} ctx={ctx} details={details} />}
    />
  );
}
