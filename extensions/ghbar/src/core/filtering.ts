import { DISPLAY_ORDER, Item, MenuSection, Row, SectionKind, Snapshot } from "./models";
import { Settings, visibleSections } from "./settings";

export function toSections(snapshot: Snapshot, settings: Settings): MenuSection[] {
  const searches: Record<SectionKind, Item[]> = {
    changesRequested: snapshot.changesRequested,
    reviewRequested: snapshot.review,
    pullRequests: snapshot.prs,
    issues: snapshot.issues,
    myPullRequests: snapshot.myPullRequests,
  };

  const visible = visibleSections(settings);

  // The same PR can match several searches. DISPLAY_ORDER decides who claims
  // it, so the strongest signal both leads and removes the duplicates.
  const claimed = new Set<string>();
  const take = (kind: SectionKind): Item[] => {
    const kept = clean(searches[kind] ?? [], settings).filter((item) => !claimed.has(item.url));
    for (const item of kept) claimed.add(item.url);
    return kept;
  };

  const result: MenuSection[] = [];
  for (const kind of DISPLAY_ORDER) {
    // A HIDDEN SECTION MUST NOT CLAIM ITEMS. Checking visibility after
    // claiming would make items vanish entirely rather than fall through:
    // changesRequested is a subset of myPullRequests, so hiding the former
    // used to hide those PRs from the latter too.
    if (!visible.has(kind)) continue;

    const items = take(kind);
    if (items.length === 0) continue; // an empty section is never rendered

    result.push({
      kind,
      rows: rowsFor(items, settings),
      truncated: snapshot.truncated.includes(kind),
    });
  }
  return result;
}

function clean(items: Item[], settings: Settings): Item[] {
  return items
    .filter((item) => settings.showBots || !item.authorIsBot)
    .filter((item) => settings.showDrafts || !item.isDraft)
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * When one repository floods a section the instinct is to exclude it, which
 * also loses the real contributions coming from it. Grouping collapses the
 * noise into a single row without hiding anything.
 *
 * The group sits at the position of that repository's NEWEST item, so a fresh
 * contribution never sinks to the bottom.
 */
function rowsFor(items: Item[], settings: Settings): Row[] {
  const threshold = settings.repoGroupThreshold;
  if (threshold <= 0) {
    return items.map((item) => ({ type: "item", item }));
  }

  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.repository, (counts.get(item.repository) ?? 0) + 1);
  }

  const result: Row[] = [];
  const emitted = new Set<string>();

  for (const item of items) {
    const repository = item.repository;
    if ((counts.get(repository) ?? 0) > threshold) {
      if (emitted.has(repository)) continue;
      emitted.add(repository);
      result.push({
        type: "group",
        repository,
        items: items.filter((candidate) => candidate.repository === repository),
      });
    } else {
      result.push({ type: "item", item });
    }
  }
  return result;
}
