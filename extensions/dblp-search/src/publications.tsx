import { useMemo, useState } from "react";
import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { useDblp } from "./hooks";
import { Author, getPublications, Publication, PublicationType, typeLabel } from "./dblp";
import { copyBibtex } from "./copy-bibtex";
import { PublicationDetail } from "./publication-detail";

const TYPE_ICON: Record<PublicationType, { source: Icon; tintColor: Color }> = {
  article: { source: Icon.Document, tintColor: Color.Purple },
  inproceedings: { source: Icon.Document, tintColor: Color.Blue },
  proceedings: { source: Icon.Folder, tintColor: Color.Green },
  book: { source: Icon.Book, tintColor: Color.Orange },
  incollection: { source: Icon.Document, tintColor: Color.Orange },
  phdthesis: { source: Icon.Crown, tintColor: Color.Yellow },
  mastersthesis: { source: Icon.Crown, tintColor: Color.Yellow },
  www: { source: Icon.Globe, tintColor: Color.SecondaryText },
  data: { source: Icon.HardDrive, tintColor: Color.Orange },
  other: { source: Icon.QuestionMark, tintColor: Color.SecondaryText },
};

export function PublicationList({ author }: { author: Author }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: publications, isLoading } = useDblp(
    (pid: string, signal?: AbortSignal) => getPublications(pid, signal),
    [author.pid],
    "Could not load publications",
  );

  const availableTypes = useMemo(() => {
    const seen = new Set<PublicationType>();
    (publications ?? []).forEach((p) => seen.add(p.type));
    return [...seen];
  }, [publications]);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return publications ?? [];
    return (publications ?? []).filter((p) => p.type === typeFilter);
  }, [publications, typeFilter]);

  // Group publications by year, preserving the newest-first ordering.
  const groups = useMemo(() => {
    const byYear = new Map<string, Publication[]>();
    for (const pub of filtered) {
      const year = pub.year ?? "Unknown year";
      const bucket = byYear.get(year);
      if (bucket) {
        bucket.push(pub);
      } else {
        byYear.set(year, [pub]);
      }
    }
    return [...byYear.entries()];
  }, [filtered]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={author.name}
      searchBarPlaceholder={`Filter ${author.name}'s publications…`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by type" value={typeFilter} onChange={setTypeFilter}>
          <List.Dropdown.Item title="All Types" value="all" />
          {availableTypes.map((type) => (
            <List.Dropdown.Item key={type} title={typeLabel(type)} value={type} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && filtered.length === 0 ? (
        <List.EmptyView
          icon={Icon.Book}
          title="No Publications Found"
          description={`DBLP has no matching records for ${author.name}.`}
        />
      ) : (
        groups.map(([year, pubs]) => (
          <List.Section
            key={year}
            title={year}
            subtitle={`${pubs.length} ${pubs.length === 1 ? "publication" : "publications"}`}
          >
            {pubs.map((pub) => (
              <PublicationItem key={pub.key} publication={pub} author={author} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function PublicationItem({ publication, author }: { publication: Publication; author: Author }) {
  const icon = TYPE_ICON[publication.type] ?? TYPE_ICON.other;

  const people = publication.authors.length > 0 ? publication.authors : publication.editors;
  const coAuthors = people.filter((a) => a !== author.name);
  const subtitle =
    coAuthors.length > 0
      ? `with ${coAuthors.slice(0, 3).join(", ")}${coAuthors.length > 3 ? ", …" : ""}`
      : undefined;

  // Year is shown in the section header, so only the venue is needed here.
  const accessories: List.Item.Accessory[] = [];
  if (publication.venue) {
    accessories.push({ tag: publication.venue });
  }

  return (
    <List.Item
      icon={icon}
      title={publication.title}
      subtitle={subtitle}
      accessories={accessories}
      keywords={[...publication.authors, ...publication.editors]}
      actions={
        <ActionPanel>
          {publication.ee && (
            <Action
              icon={Icon.Link}
              title="Open Publication (doi / Pdf)"
              onAction={() => open(publication.ee!)}
            />
          )}
          <Action.Push
            icon={Icon.Sidebar}
            title="Show Details"
            target={<PublicationDetail publication={publication} />}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          {publication.dblpUrl && (
            <Action
              icon={Icon.Globe}
              title="Open on Dblp"
              onAction={() => open(publication.dblpUrl!)}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          )}
          <ActionPanel.Section>
            {publication.ee && (
              <Action.CopyToClipboard
                title="Copy Publication Link"
                content={publication.ee}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            )}
            <Action.CopyToClipboard
              title="Copy Title"
              content={publication.title}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action
              icon={Icon.Clipboard}
              title="Copy Bibtex"
              onAction={() => copyBibtex(publication)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
