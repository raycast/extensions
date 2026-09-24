import { Color, Detail, Icon, Image, List } from "@raycast/api";
import { useChangelog } from "../hooks/useChangelog";
import { StoreItem } from "../types";
import { ChangelogActions } from "./ChangelogActions";
import { formatVersionAge, parseChangelog } from "../utils/changelog";

interface ChangelogDetailProps {
  slug: string;
  title: string;
  items: StoreItem[];
  currentIndex: number;
}

/**
 * Icon for a version row, mirroring Raycast's own Version History: a rocket on the initial
 * release, a check on the newest release after it, and a refresh arrow on everything between.
 *
 * All three are positional. The initial release is the LAST row, not the one whose heading
 * says "Initial": across a random 250 of the monorepo's changelogs (2026-09-22), matching
 * /initial|first release/ missed 50 initial releases — headed `1.0.0`, `Added Extension to
 * Store` and the like — and fired mid-list in 2 more. The last row was the initial release
 * in 247 of 250; the other 3 files are not written newest-first, and nothing here sorts.
 * Keying glyphs off heading words failed the same way earlier (Bug/Plus/Circle for
 * Fix/Feature/Improvement): the vocabulary is uncontrolled, position is not.
 */
function versionIcon(index: number, count: number): Image.ImageLike {
  // The initial release always gets the rocket — including when it is the only version,
  // which is 111 of those 250 changelogs. The check goes to the newest release only
  // when that is not also the first.
  const source = index === count - 1 ? Icon.Rocket : index === 0 ? Icon.CheckCircle : Icon.ArrowClockwise;
  return { source, tintColor: Color.SecondaryText };
}

export function ChangelogDetail({ slug, title, items, currentIndex }: ChangelogDetailProps) {
  const { data: changelog, isLoading } = useChangelog(slug);
  const versions = parseChangelog(changelog);
  const actions = <ChangelogActions items={items} currentIndex={currentIndex} changelog={changelog} slug={slug} />;

  // Fall back to the raw document whenever the file has no version headings to split on.
  // A changelog that does not follow the `## [Title] - date` convention is still worth
  // reading; an empty list would just lose it.
  if (!isLoading && versions.length === 0) {
    return (
      <Detail
        markdown={changelog ?? `# ${title}\n\nNo changelog available for this extension.`}
        navigationTitle={`${title} — Changelog`}
        actions={actions}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      // Shown whenever no row is selected — while the changelog is still loading, and
      // when a search filters out every version. Without it those states have no actions.
      actions={actions}
      navigationTitle={`${title} — Version History`}
      searchBarPlaceholder="Search versions…"
    >
      <List.Section title="Changes" subtitle={versions.length > 0 ? `${versions.length}` : undefined}>
        {versions.map((version, index) => {
          const age = formatVersionAge(version.date);
          return (
            <List.Item
              key={`${version.title}-${index}`}
              icon={versionIcon(index, versions.length)}
              title={version.title}
              accessories={version.date ? [{ date: version.date }] : undefined}
              detail={
                <List.Item.Detail
                  markdown={`## ${version.title}${age ? ` (${age})` : ""}\n\n${
                    version.body || "_No details for this version._"
                  }`}
                />
              }
              actions={
                <ChangelogActions
                  items={items}
                  currentIndex={currentIndex}
                  changelog={changelog}
                  slug={slug}
                  selectedVersion={{ title: version.title, body: version.body }}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
