import { Action, ActionPanel, Detail, Grid, Icon, open, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CHALLENGES_ACTION_ICON,
  DETAILS_ACTION_ICON,
  GLOBE_ACTION_ICON,
  MAP_ACTION_ICON,
  PLAY_ACTION_ICON,
  RESOURCE_CONFIG,
} from "./config";
import { fetchAllEntriesForFilter, hydrateChallengeRecords, openChallengeYouTube, requestJson } from "./api";
import type { ApiRecord, ChallengeEntry, ChallengeFilter, RelationItem } from "./types";
import {
  buildDetailMarkdown,
  buildDetailMetadata,
  canWatchOnYouTube,
  extractRelatedChallengeRecords,
  getChallengeAccessory,
  getFilterForRelationSection,
  getFirstRecord,
  groupChallengeEntriesByYear,
  getLocationMapUrl,
  getLocationTitle,
  getRecordJsonUrl,
  getRecordUrl,
  getDisplayValue,
  relationMatchesRecord,
  toChallengeEntries,
  unwrapRecord,
} from "./lib/records";

export function ChallengeDetail({ entry }: { entry: ChallengeEntry }) {
  const { push } = useNavigation();
  const [resolvedRecord, setResolvedRecord] = useState<ApiRecord>(entry.record);
  const [isResolvingRecord, setIsResolvingRecord] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const initialRecord = entry.record;
    setResolvedRecord(initialRecord);

    const jsonUrl = getRecordJsonUrl(initialRecord);
    if (!jsonUrl) {
      setIsResolvingRecord(false);
      return;
    }

    setIsResolvingRecord(true);

    void (async () => {
      try {
        const payload = await requestJson(jsonUrl);
        const fullRecord = getFirstRecord(payload);
        if (!cancelled && fullRecord) {
          setResolvedRecord(unwrapRecord(fullRecord));
        }
      } catch {
        if (!cancelled) {
          setResolvedRecord(initialRecord);
        }
      } finally {
        if (!cancelled) {
          setIsResolvingRecord(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entry.id, entry.record]);

  const handleOpenRelation = useCallback(
    (item: RelationItem) => {
      const filter = getFilterForRelationSection(item.section);
      if (filter) {
        push(<RelatedResourceScreen relation={item} filter={filter} />);
        return;
      }

      if (item.url) {
        void open(item.url);
      }
    },
    [push],
  );

  const handleOpenTShirt = useCallback(() => {
    const title = getDisplayValue(resolvedRecord, ["title", "name", "challenge_name", "slug"], entry.title);
    const id = getDisplayValue(resolvedRecord, ["id"], "");
    const slug = getDisplayValue(resolvedRecord, ["slug"], "");
    const url = getRecordUrl(resolvedRecord);

    push(
      <RelatedTShirtScreen
        relation={{
          title,
          ...(id ? { id } : {}),
          ...(slug ? { slug } : {}),
          ...(url ? { url } : {}),
        }}
      />,
    );
  }, [entry.title, push, resolvedRecord]);

  return (
    <Detail
      isLoading={isResolvingRecord}
      markdown={buildDetailMarkdown(entry, resolvedRecord)}
      metadata={buildDetailMetadata(resolvedRecord, handleOpenRelation, handleOpenTShirt)}
      actions={
        <ActionPanel>
          {getRecordUrl(resolvedRecord) ? (
            <Action.OpenInBrowser
              title="Open in Beardtown"
              url={getRecordUrl(resolvedRecord)!}
              icon={GLOBE_ACTION_ICON}
            />
          ) : null}
          {canWatchOnYouTube(resolvedRecord) ? (
            <Action
              title="Watch on YouTube"
              icon={PLAY_ACTION_ICON}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
              onAction={() => void openChallengeYouTube(resolvedRecord)}
            />
          ) : null}
          {getLocationTitle(resolvedRecord) ? (
            <Action.OpenInBrowser
              title="Open on Map"
              url={getLocationMapUrl(getLocationTitle(resolvedRecord))}
              icon={MAP_ACTION_ICON}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export function entryActions(
  entry: ChallengeEntry,
  selectedFilter: ChallengeFilter,
  sectionEntries: ChallengeEntry[] = [],
) {
  const isChallenge = selectedFilter === "challenges";

  return (
    <ActionPanel>
      {!isChallenge ? (
        <Action.Push
          title="View Related Challenges"
          icon={CHALLENGES_ACTION_ICON}
          target={
            <RelatedChallengesGrid
              sourceEntries={sectionEntries}
              initialEntryId={entry.id}
              parentFilter={selectedFilter}
            />
          }
        />
      ) : null}
      {isChallenge ? (
        <Action.Push
          title="View Challenge Details"
          target={<ChallengeDetail entry={entry} />}
          icon={DETAILS_ACTION_ICON}
        />
      ) : null}
      {getRecordUrl(entry.record) ? (
        <Action.OpenInBrowser title="Open in Beardtown" url={getRecordUrl(entry.record)!} icon={GLOBE_ACTION_ICON} />
      ) : null}
      {isChallenge && canWatchOnYouTube(entry.record) ? (
        <Action
          title="Watch on YouTube"
          icon={PLAY_ACTION_ICON}
          shortcut={{ modifiers: ["cmd"], key: "y" }}
          onAction={() => void openChallengeYouTube(entry.record)}
        />
      ) : null}
      {isChallenge && getLocationTitle(entry.record) ? (
        <Action.OpenInBrowser
          title="Open on Map"
          url={getLocationMapUrl(getLocationTitle(entry.record))}
          icon={MAP_ACTION_ICON}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
      ) : null}
    </ActionPanel>
  );
}

export function tShirtEntryActions(entry: ChallengeEntry) {
  return (
    <ActionPanel>
      <Action.Push title="Open T-Shirt" target={<TShirtDetail entry={entry} />} icon={DETAILS_ACTION_ICON} />
      <Action.Push
        title="View Challenge Details"
        target={<ChallengeDetail entry={entry} />}
        icon={CHALLENGES_ACTION_ICON}
      />
    </ActionPanel>
  );
}

export function TShirtDetail({ entry }: { entry: ChallengeEntry }) {
  return (
    <Detail
      navigationTitle={RESOURCE_CONFIG.tshirts.title}
      markdown={entry.thumbnailUrl ? `![${entry.title}](${entry.thumbnailUrl})` : `# ${entry.title}`}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Challenge Details"
            target={<ChallengeDetail entry={entry} />}
            icon={CHALLENGES_ACTION_ICON}
          />
        </ActionPanel>
      }
    />
  );
}

export function RelatedTShirtScreen({ relation }: { relation: RelationItem }) {
  const [matchedEntry, setMatchedEntry] = useState<ChallengeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMatchedEntry(null);
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const loadedEntries = await fetchAllEntriesForFilter("tshirts");
        if (cancelled) {
          return;
        }

        const nextMatchedEntry = loadedEntries.find((entry) => relationMatchesRecord(relation, entry.record));
        if (!nextMatchedEntry) {
          setError(`Couldn't find ${relation.title} in ${RESOURCE_CONFIG.tshirts.title}.`);
          setIsLoading(false);
          return;
        }

        setMatchedEntry(nextMatchedEntry);
        setIsLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : `Failed to load ${RESOURCE_CONFIG.tshirts.title}.`);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [relation]);

  if (matchedEntry) {
    return <TShirtDetail entry={matchedEntry} />;
  }

  return (
    <Detail
      navigationTitle={RESOURCE_CONFIG.tshirts.title}
      isLoading={isLoading}
      markdown=""
      metadata={
        error ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Error" text={error} />
          </Detail.Metadata>
        ) : undefined
      }
    />
  );
}

export function RelatedChallengesGrid({
  sourceEntries,
  initialEntryId,
  parentFilter,
}: {
  sourceEntries: ChallengeEntry[];
  initialEntryId: string;
  parentFilter: ChallengeFilter;
}) {
  const [selectedEntryId, setSelectedEntryId] = useState(initialEntryId);
  const selectedEntry = useMemo(
    () => sourceEntries.find((entry) => entry.id === selectedEntryId) ?? sourceEntries[0],
    [selectedEntryId, sourceEntries],
  );
  const relatedRecords = useMemo(
    () => (selectedEntry ? extractRelatedChallengeRecords(selectedEntry.record) : []),
    [selectedEntry],
  );
  const [resolvedRelatedRecords, setResolvedRelatedRecords] = useState<ApiRecord[] | null>(null);
  const [isLoadingResolvedRecords, setIsLoadingResolvedRecords] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setResolvedRelatedRecords(null);

    if (relatedRecords.length === 0) {
      setResolvedRelatedRecords([]);
      setIsLoadingResolvedRecords(false);
      return;
    }

    setIsLoadingResolvedRecords(true);

    void (async () => {
      try {
        const hydratedRecords = await hydrateChallengeRecords(relatedRecords);
        if (!cancelled) {
          setResolvedRelatedRecords(hydratedRecords);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingResolvedRecords(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [relatedRecords]);

  const entries = useMemo(
    () => toChallengeEntries(resolvedRelatedRecords ?? [], "challenges"),
    [resolvedRelatedRecords],
  );
  const yearSections = useMemo(() => groupChallengeEntriesByYear(entries), [entries]);
  const isResolvingEntries = isLoadingResolvedRecords || resolvedRelatedRecords === null;

  return (
    <Grid
      navigationTitle={`${selectedEntry?.title ?? RESOURCE_CONFIG[parentFilter].title} Challenges`}
      isLoading={isResolvingEntries}
      columns={4}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      searchBarPlaceholder={`Search ${selectedEntry?.title ?? RESOURCE_CONFIG[parentFilter].title} Challenges`}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip={RESOURCE_CONFIG[parentFilter].title}
          value={selectedEntry?.id}
          onChange={setSelectedEntryId}
        >
          <Grid.Dropdown.Section title={RESOURCE_CONFIG[parentFilter].title}>
            {sourceEntries.map((entry) => (
              <Grid.Dropdown.Item key={entry.id} title={entry.title} value={entry.id} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {!isResolvingEntries && entries.length === 0 ? (
        <Grid.EmptyView
          title="No Related Challenges"
          description={`No related challenges were found for ${selectedEntry?.title ?? "this item"}.`}
          icon={Icon.MagnifyingGlass}
        />
      ) : null}

      {yearSections.map((section) => (
        <Grid.Section
          key={section.title}
          title={section.title}
          subtitle={`${section.count} ${section.count === 1 ? "Challenge" : "Challenges"}`}
        >
          {section.items.map((relatedEntry) => (
            <Grid.Item
              key={relatedEntry.id}
              id={relatedEntry.id}
              title={relatedEntry.title}
              subtitle={relatedEntry.subtitle || undefined}
              keywords={relatedEntry.keywords}
              content={relatedEntry.thumbnailUrl ? { source: relatedEntry.thumbnailUrl } : Icon.Image}
              accessory={getChallengeAccessory(relatedEntry.record)}
              actions={entryActions(relatedEntry, "challenges")}
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}

export function RelatedResourceScreen({ relation, filter }: { relation: RelationItem; filter: ChallengeFilter }) {
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries([]);
    setSelectedEntryId(null);
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const loadedEntries = await fetchAllEntriesForFilter(filter);
        if (cancelled) {
          return;
        }

        const matchedEntry = loadedEntries.find((entry) => relationMatchesRecord(relation, entry.record));

        if (!matchedEntry) {
          setError(`Couldn't find ${relation.title} in ${RESOURCE_CONFIG[filter].title}.`);
          setIsLoading(false);
          return;
        }

        setEntries(loadedEntries);
        setSelectedEntryId(matchedEntry.id);
        setIsLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : `Failed to load ${relation.title}.`);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filter, relation]);

  if (entries.length > 0 && selectedEntryId) {
    return <RelatedChallengesGrid sourceEntries={entries} initialEntryId={selectedEntryId} parentFilter={filter} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown=""
      metadata={
        error ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Error" text={error} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        relation.url ? (
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Beardtown" url={relation.url} icon={GLOBE_ACTION_ICON} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
