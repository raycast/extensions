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
import { entryUrl } from "../lib/entry-url";
import { PrimaryAction } from "../lib/preferences";
import { memberCount, membersOf } from "../lib/search";
import {
  boilerplate,
  importStatement,
  markdownLink,
  migrationFor,
  searchSourceUrl,
} from "../lib/snippets";
import {
  DocEntry,
  isType,
  KIND_LABELS,
  MetaIndex,
  SECTIONS,
} from "../lib/types";

export interface ViewContext {
  entries: DocEntry[];
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

function isDeprecated(ctx: ViewContext, entry: DocEntry): boolean {
  return Boolean(ctx.meta[entry.name]?.deprecated);
}

function hasMembers(entry: DocEntry): boolean {
  return isType(entry.kind) || entry.kind === "package";
}

function legacySchedulerNotice(flagged: boolean | undefined): string | null {
  return flagged
    ? "> ⚠️ **Not supported on Folia.** Most `BukkitScheduler` methods throw `UnsupportedOperationException` on a regionised server — use `GlobalRegionScheduler`, `RegionScheduler`, `EntityScheduler` or `AsyncScheduler` instead."
    : null;
}

function migrationMarkdown(entry: DocEntry): string | null {
  const migration = migrationFor(entry);
  if (!migration) return null;

  const blocks = migration.equivalents.map(
    (equivalent) =>
      `**${equivalent.api}**\n\n\`\`\`java\n${equivalent.code}\n\`\`\``,
  );
  return ["## Folia Equivalent", migration.guidance, ...blocks].join("\n\n");
}

function detailMarkdown(
  entry: DocEntry,
  details: DocDetails | undefined,
  meta: MetaIndex,
): string {
  const badges = meta[entry.name];
  const signature = details?.signature
    ? `\`\`\`java\n${details.signature}\n\`\`\``
    : "";

  return [
    `# ${entry.display}`,
    legacySchedulerNotice(badges?.legacyScheduler),
    signature,
    details?.markdown ?? "",
    migrationMarkdown(entry),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function entryAccessories(
  entry: DocEntry,
  ctx: ViewContext,
): List.Item.Accessory[] {
  const meta = ctx.meta[entry.name];
  const accessories: List.Item.Accessory[] = [];

  if (meta?.deprecated)
    accessories.push({ tag: { value: "deprecated", color: Color.Red } });
  if (meta?.legacyScheduler)
    accessories.push({
      tag: { value: "not on Folia", color: Color.Orange },
      tooltip: "This scheduler is not supported on a regionised server",
    });
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
  const members = hasMembers(entry) ? memberCount(ctx.entries, entry) : 0;
  const references = (details?.references ?? [])
    .map((name) => ctx.entries.find((candidate) => candidate.name === name))
    .filter(
      (candidate): candidate is DocEntry =>
        Boolean(candidate) && candidate?.name !== entry.name,
    );
  const snippet = boilerplate(entry);
  const migration = migrationFor(entry);
  const source = searchSourceUrl(entry);
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
      url={entryUrl(entry)}
      shortcut={Keyboard.Shortcut.Common.Open}
      onOpen={() => ctx.addRecent(entry.name)}
    />
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {ctx.primaryAction === "browser" ? openInBrowser : showDetails}
        {ctx.primaryAction === "browser" ? showDetails : openInBrowser}
        {members > 0 ? (
          <Action
            title={`Show ${members} Members`}
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

      {migration && (
        <ActionPanel.Section title="Folia Migration">
          {migration.equivalents.map((equivalent) => (
            <Action.CopyToClipboard
              key={equivalent.api}
              title={`Copy as ${equivalent.api}`}
              content={equivalent.code}
              icon={Icon.Wand}
            />
          ))}
        </ActionPanel.Section>
      )}

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
            shortcut={{ modifiers: ["cmd"], key: "e" }}
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
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
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
          content={entryUrl(entry)}
          shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
        />
        {source ? (
          <Action.OpenInBrowser
            title="Search Source on GitHub"
            url={source}
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

function EntryMetadata({ entry }: { entry: DocEntry }) {
  return (
    <>
      <List.Item.Detail.Metadata.Label
        title="Kind"
        text={KIND_LABELS[entry.kind]}
      />
      <List.Item.Detail.Metadata.Label
        title="Section"
        text={sectionTitle(entry)}
      />
      {entry.pkg ? (
        <List.Item.Detail.Metadata.Label title="Package" text={entry.pkg} />
      ) : null}
      {entry.version ? (
        <List.Item.Detail.Metadata.Label title="Version" text={entry.version} />
      ) : null}
    </>
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

  const { data: details, isLoading: isLoadingDetails } = usePromise(
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
              subtitle={ctx.showDetail ? undefined : entry.pkg}
              accessories={
                ctx.showDetail ? undefined : entryAccessories(entry, ctx)
              }
              detail={
                entry.name === selected ? (
                  <List.Item.Detail
                    isLoading={isLoadingDetails}
                    markdown={detailMarkdown(entry, details, ctx.meta)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <EntryMetadata entry={entry} />
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
  const members = membersOf(ctx.entries, parent, (candidate) =>
    isDeprecated(ctx, candidate),
  );

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
  const meta = ctx.meta[entry.name];

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
            {meta?.deprecated && (
              <Detail.Metadata.TagList.Item
                text="deprecated"
                color={Color.Red}
              />
            )}
            {meta?.legacyScheduler && (
              <Detail.Metadata.TagList.Item
                text="not on Folia"
                color={Color.Orange}
              />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Section" text={sectionTitle(entry)} />
          {entry.pkg ? (
            <Detail.Metadata.Label title="Package" text={entry.pkg} />
          ) : null}
          {entry.version ? (
            <Detail.Metadata.Label title="Version" text={entry.version} />
          ) : null}
          <Detail.Metadata.Link
            title="Documentation"
            target={entryUrl(entry)}
            text={
              entry.kind === "guide"
                ? "Open on docs.papermc.io"
                : "Open Javadoc"
            }
          />
        </Detail.Metadata>
      }
      actions={<EntryActions entry={entry} ctx={ctx} details={details} />}
    />
  );
}
