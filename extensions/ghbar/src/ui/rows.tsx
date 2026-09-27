import { Color, Icon, MenuBarExtra, openCommandPreferences } from "@raycast/api";
import { age, spokenAge } from "../core/format";
import { Item, MenuSection, repositoryName, Row, SECTION_TITLE, rowItems } from "../core/models";
import { groupIcon, itemIcon } from "./icons";

export interface RowContext {
  /** Show the owner too, when more than one account or org is watched. */
  showOwner: boolean;
  isSeen: (url: string) => boolean;
  /** Top-level rows a section may show. */
  maxRows: number;
  now: Date;
  onOpen: (url: string) => void;
}

/**
 * Information order: the identity you scan for first (repository + number),
 * then the content, then the age. `title` renders strong, `subtitle` faded.
 */
export function ItemRow({ item, context }: { item: Item; context: RowContext }) {
  const seen = context.isSeen(item.url);
  const name = context.showOwner ? item.repository : repositoryName(item.repository);
  const draft = item.isDraft ? "Draft · " : "";

  return (
    <MenuBarExtra.Item
      title={`${name} #${item.number}`}
      subtitle={`${draft}${item.title} · ${age(item.createdAt, context.now)}`}
      icon={itemIcon(item, seen)}
      // The untruncated title and the read state. Raycast has no separate
      // accessibility prop, so the tooltip carries both.
      tooltip={[
        item.title,
        `@${item.authorLogin}`,
        spokenAge(item.createdAt, context.now),
        seen ? "read" : "unread",
      ].join(" · ")}
      onAction={() => context.onOpen(item.url)}
    />
  );
}

/** Items from one repository, collapsed. `Submenu` has no `subtitle`, so the
 * count goes into the title. */
export function GroupRow({ repository, items, context }: { repository: string; items: Item[]; context: RowContext }) {
  const unseen = items.some((item) => !context.isSeen(item.url));
  const name = context.showOwner ? repository : repositoryName(repository);

  return (
    <MenuBarExtra.Submenu title={`${name} (${items.length})`} icon={groupIcon(unseen)}>
      {items.map((item) => (
        <ItemRow key={item.url} item={item} context={context} />
      ))}
    </MenuBarExtra.Submenu>
  );
}

function RowNode({ row, context }: { row: Row; context: RowContext }) {
  if (row.type === "item") {
    return <ItemRow item={row.item} context={context} />;
  }
  return <GroupRow repository={row.repository} items={row.items} context={context} />;
}

const TRUNCATION_NOTE = "Showing first 100 — narrow your filters";

/**
 * A section: header, rows, overflow submenu, truncation notice.
 *
 * No row-budget solver here — the Raycast dropdown scrolls on its own, so a
 * per-section cap and a slice are all that is needed.
 */
export function SectionBlock({ section, context }: { section: MenuSection; context: RowContext }) {
  const visible = section.rows.slice(0, context.maxRows);
  let overflow = section.rows.slice(context.maxRows);

  // A "1 more…" row costs as much space as the item; just show the item.
  if (overflow.length === 1) {
    visible.push(overflow[0]);
    overflow = [];
  }

  return (
    <MenuBarExtra.Section title={SECTION_TITLE[section.kind]}>
      {visible.map((row) => (
        <RowNode key={rowKey(row)} row={row} context={context} />
      ))}

      {overflow.length > 0 && (
        <MenuBarExtra.Submenu title={`${overflow.length} more…`}>
          {overflow.map((row) => (
            <RowNode key={rowKey(row)} row={row} context={context} />
          ))}
          {/* Rare enough that it should not spend a top-level row. */}
          {section.truncated && <MenuBarExtra.Item title={TRUNCATION_NOTE} />}
        </MenuBarExtra.Submenu>
      )}

      {overflow.length === 0 && section.truncated && <MenuBarExtra.Item title={TRUNCATION_NOTE} />}
    </MenuBarExtra.Section>
  );
}

function rowKey(row: Row): string {
  return row.type === "item" ? row.item.url : `group:${row.repository}`;
}

/** Total items across sections, including those inside groups. */
export function countItems(sections: MenuSection[]): number {
  return sections.flatMap((section) => section.rows.flatMap(rowItems)).length;
}

/**
 * An empty menu must say WHY it is empty. When a filter is responsible, its
 * name and the way back sit in the same place.
 *
 * Raycast has no API for writing preferences, so the way back is opening the
 * preferences pane rather than undoing the filter in one click.
 */
export function EmptyState({
  organizations,
  repositoryFilterActive,
  allSectionsHidden,
}: {
  organizations: string[];
  repositoryFilterActive: boolean;
  allSectionsHidden: boolean;
}) {
  const caughtUp = (title: string) => (
    <MenuBarExtra.Item title={title} icon={{ source: Icon.CheckCircle, tintColor: Color.SecondaryText }} />
  );
  const settingsRow = (
    <MenuBarExtra.Item title="Open Settings…" icon={Icon.Gear} onAction={() => openCommandPreferences()} />
  );

  // Every section off is a configuration mistake, NOT "no work waiting".
  // Showing the same row for both would tell the user something false.
  if (allSectionsHidden) {
    return (
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Every section is turned off"
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
        />
        {settingsRow}
      </MenuBarExtra.Section>
    );
  }

  if (organizations.length > 0) {
    const scope = organizations.length === 1 ? organizations[0] : `${organizations.length} organizations`;
    return (
      <MenuBarExtra.Section>
        {caughtUp(`No open work assigned to you in ${scope}`)}
        {settingsRow}
      </MenuBarExtra.Section>
    );
  }

  if (repositoryFilterActive) {
    return (
      <MenuBarExtra.Section>
        {caughtUp("No open work in the watched repositories")}
        {settingsRow}
      </MenuBarExtra.Section>
    );
  }

  return <MenuBarExtra.Section>{caughtUp("You're all caught up")}</MenuBarExtra.Section>;
}
