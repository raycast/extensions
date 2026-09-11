import { useState } from "react";
import { Action, ActionPanel, Icon, Image, List, useNavigation } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { deleteRecord, listAttributeStatuses, queryRecords, searchRecords } from "./api/endpoints";
import { DEFAULT_PAGE_SIZE as PAGE_SIZE } from "./api/operations";
import type { AttioObject, AttioRecord, AttributeValue, SearchHit } from "./api/types";
import ExportActions from "./components/ExportActions";
import { guard } from "./components/Guard";
import RecordActions from "./components/RecordActions";
import RecordDetail from "./components/RecordDetail";
import RecordScreen from "./components/RecordScreen";
import { useAttio } from "./hooks/useAttio";
import { useMembers } from "./hooks/useMembers";
import { usePins } from "./hooks/usePins";
import { useRecordTitles } from "./hooks/useRecordTitles";
import { useSchema } from "./hooks/useSchema";
import { cacheNs } from "./hooks/useSelf";
import { getObjectTitle, recordSubtitle, recordTitle, SORT_OPTIONS } from "./lib/display";
import { formatValues, getRecordReferences, shortId } from "./lib/format";
import { recordIcon, STANDARD_OBJECT_ICONS } from "./lib/record-icon";

export default function Records({ object }: { object: AttioObject }) {
  const schema = useSchema();
  const members = useMembers();
  const pins = usePins(object.api_slug ?? "");
  const { push } = useNavigation();
  const isDeals = object.api_slug === "deals";
  const sortOptions = SORT_OPTIONS[object.api_slug ?? ""];
  const [sort, setSort] = useCachedState<string>("records-sort-" + (object.api_slug ?? ""), "");
  const activeSort = sortOptions?.find((o) => `${o.attribute}:${o.direction}` === sort);
  const [selectedStage, setSelectedStage] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<{ actorId: string; label: string } | null>(null);
  const { data: stageStatuses } = useCachedPromise(
    async (_fp: string, slug: string) =>
      (await listAttributeStatuses(slug, "stage")).data.filter((s) => !s.is_archived),
    [cacheNs, object.api_slug ?? ""],
    { execute: isDeals },
  );
  const h = useAttio(
    "queryRecords",
    (slug: string, sortValue: string, stage: string, ownerId: string) =>
      async ({ page }: { page: number }) => {
        const chosen = SORT_OPTIONS[slug]?.find((o) => `${o.attribute}:${o.direction}` === sortValue);
        const filter: Record<string, unknown> = {};
        if (stage) filter.stage = stage;
        if (ownerId) filter.owner = { referenced_actor_id: ownerId };
        const { data } = await queryRecords(slug, {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          sorts: [
            chosen
              ? { direction: chosen.direction, attribute: chosen.attribute }
              : { direction: "desc", attribute: "created_at" },
          ],
          ...(Object.keys(filter).length > 0 ? { filter } : {}),
        });
        return { data, hasMore: data.length === PAGE_SIZE };
      },
    [object.api_slug, sort, selectedStage, ownerFilter?.actorId ?? ""],
  );
  const { isLoading, data, pagination, revalidate, mutate } = h;
  const records: AttioRecord[] = data ?? [];
  const [showDetail, setShowDetail] = useCachedState<boolean>("show-detail-records", true);

  const [searchText, setSearchText] = useState("");
  const searching = searchText.trim().length > 0;
  const searchH = useAttio(
    "searchRecords",
    async (slug: string, text: string) => (text.trim() ? (await searchRecords(text, [slug])).data : []),
    [object.api_slug ?? "", searchText],
  );
  const searchHits: SearchHit[] = searchH.data ?? [];

  // Resolve references visible in the current page (cap handled by the hook).
  const refs = records.flatMap((r) => getRecordReferences(r.values));
  const { titleFor } = useRecordTitles(refs);

  const g = guard(h.guardInput(records.length > 0));
  if (g) return g;

  const attributes = schema.attributesFor(object.api_slug ?? "");
  const visibleAttributes = attributes?.filter((a) => !a.is_archived) ?? [];
  // CURRENTLY LOADED rows only (the loaded `records` page), not a re-fetch.
  const exportAction = (
    <ExportActions
      filenameBase={object.api_slug ?? "records"}
      columns={visibleAttributes.map((a) => a.title)}
      rows={records.map((r) =>
        visibleAttributes.map((a) => formatValues(r.values[a.api_slug] ?? [], { memberName: members.nameFor })),
      )}
    />
  );
  const pinnedRecords = records.filter((r) => pins.pinned.has(r.id.record_id));
  const mainRecords = records.filter((r) => !pins.pinned.has(r.id.record_id));

  const makeDeleteHandler = (record: AttioRecord) => async () => {
    await mutate(deleteRecord(object.api_slug ?? "", record.id.record_id), {
      optimisticUpdate: (current) => (current ?? []).filter((r: AttioRecord) => r.id.record_id !== record.id.record_id),
      shouldRevalidateAfter: false,
    });
  };

  const renderItem = (record: AttioRecord) => {
    const isPinned = pins.pinned.has(record.id.record_id);
    const ownerRef = isDeals
      ? record.values["owner"]?.find(
          (v): v is Extract<AttributeValue, { attribute_type: "actor-reference" }> =>
            v.attribute_type === "actor-reference" && !!v.referenced_actor_id,
        )
      : undefined;
    const ownerLabel = ownerRef?.referenced_actor_id
      ? (members.nameFor(ownerRef.referenced_actor_id) ?? shortId(ownerRef.referenced_actor_id))
      : undefined;
    return (
      <List.Item
        key={record.id.record_id}
        icon={recordIcon(record, object.api_slug ?? "")}
        title={recordTitle(record, object.api_slug ?? "")}
        subtitle={recordSubtitle(record, object.api_slug ?? "")}
        detail={
          <RecordDetail record={record} attributes={attributes} titleFor={titleFor} memberName={members.nameFor} />
        }
        actions={
          <ActionPanel>
            <RecordActions
              record={record}
              objectSlug={object.api_slug ?? ""}
              singularNoun={object.singular_noun ?? "Record"}
              attributes={attributes}
              titleFor={titleFor}
              onMutated={revalidate}
              onDelete={makeDeleteHandler(record)}
              pins={{ pinned: isPinned, toggle: () => pins.toggle(record.id.record_id) }}
              pushFallback={(slug, id) => push(<RecordScreen objectSlug={slug} recordId={id} />)}
              extraViewActions={
                <>
                  {isDeals && ownerRef?.referenced_actor_id && !ownerFilter && (
                    <Action
                      icon={Icon.Person}
                      title="Show Only This Owner's Deals"
                      onAction={() =>
                        setOwnerFilter({ actorId: ownerRef.referenced_actor_id as string, label: ownerLabel ?? "" })
                      }
                    />
                  )}
                  {isDeals && ownerFilter && (
                    <Action icon={Icon.XMarkCircle} title="Show All Deals" onAction={() => setOwnerFilter(null)} />
                  )}
                  <Action
                    title="Toggle Sidebar"
                    icon={Icon.AppWindowSidebarRight}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "d" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                    }}
                    onAction={() => setShowDetail((v) => !v)}
                  />
                  {sortOptions && (
                    <ActionPanel.Submenu title="Sort by" icon={Icon.ChevronUpDown}>
                      {sortOptions.map((option) => (
                        <Action
                          key={`${option.attribute}:${option.direction}`}
                          title={option.title}
                          icon={activeSort === option ? Icon.Check : undefined}
                          onAction={() => setSort(`${option.attribute}:${option.direction}`)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  )}
                </>
              }
            />
            <ActionPanel.Section>{exportAction}</ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const renderSearchItem = (hit: SearchHit) => {
    const isPinned = pins.pinned.has(hit.id.record_id);
    return (
      <List.Item
        key={hit.id.record_id}
        icon={
          hit.record_image
            ? { source: hit.record_image, mask: Image.Mask.RoundedRectangle }
            : (STANDARD_OBJECT_ICONS[object.api_slug ?? ""] ?? Icon.Document)
        }
        title={hit.record_text}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                icon={Icon.Text}
                title="Show Record"
                target={<RecordScreen objectSlug={object.api_slug ?? ""} recordId={hit.id.record_id} />}
              />
              <Action
                icon={isPinned ? Icon.TackDisabled : Icon.Tack}
                title={isPinned ? "Unpin Record" : "Pin Record"}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "p" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "p" },
                }}
                onAction={() => pins.toggle(hit.id.record_id)}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const navigationTitle = `Objects / ${getObjectTitle(object)} / Records${ownerFilter ? ` — ${ownerFilter.label}'s deals` : ""}`;

  return (
    <List
      isLoading={searching ? searchH.isLoading : isLoading || schema.isLoading}
      pagination={searching ? undefined : pagination}
      navigationTitle={navigationTitle}
      isShowingDetail={!searching && records.length > 0 && showDetail}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        isDeals ? (
          <List.Dropdown tooltip="Filter by Deal Stage" storeValue value={selectedStage} onChange={setSelectedStage}>
            <List.Dropdown.Item title="All Stages" value="" />
            {stageStatuses?.map((s) => (
              <List.Dropdown.Item key={s.title} title={s.title} value={s.title} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {searching ? (
        searchHits.length === 0 && !searchH.isLoading ? (
          <List.EmptyView icon={Icon.MagnifyingGlass} title={`No matches in ${object.plural_noun ?? "records"}`} />
        ) : (
          searchHits.map(renderSearchItem)
        )
      ) : !isLoading && records.length === 0 ? (
        <List.EmptyView
          icon={Icon.Document}
          title={`No ${(object.singular_noun ?? object.api_slug ?? "").toLowerCase()} records`}
        />
      ) : (
        <>
          {pinnedRecords.length > 0 && <List.Section title="Pinned">{pinnedRecords.map(renderItem)}</List.Section>}
          <List.Section title={object.plural_noun ?? "Records"} subtitle={`${mainRecords.length}`}>
            {mainRecords.map(renderItem)}
          </List.Section>
        </>
      )}
    </List>
  );
}
