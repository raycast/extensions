import { Action, ActionPanel, Icon, List, environment, openExtensionPreferences } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listDrafts, listSocialSets, listTags } from "../lib/api";
import { ApiKeyRequiredView } from "../components/api-key-required";
import {
  DEFAULT_SOCIAL_SET_STORAGE_KEY,
  LAST_SOCIAL_SET_STORAGE_KEY,
  DRAFT_STATUS_OPTIONS,
  type DraftStatus,
} from "../lib/constants";
import { getPreferences } from "../lib/preferences";
import { getErrorMessage, groupSocialSetsByTeam } from "../lib/utils";
import { CreateDraftForm } from "./create-draft";
import { DraftItem } from "./drafts-components";
import { getScheduledSortTime } from "./drafts-helpers";

const SOCIAL_SETS_COMMAND_URL = `raycast://extensions/${encodeURIComponent(
  environment.ownerOrAuthorName,
)}/${encodeURIComponent(environment.extensionName)}/social-sets`;

export function DraftsList(props: { socialSetId?: string; fixedStatus?: DraftStatus }) {
  const [defaultSocialSetId] = useCachedState<string>(DEFAULT_SOCIAL_SET_STORAGE_KEY);
  const [lastSocialSetId, setLastSocialSetId] = useCachedState<string>(LAST_SOCIAL_SET_STORAGE_KEY);
  const [selectedSocialSetId, setSelectedSocialSetId] = useState<string | undefined>(props.socialSetId);
  const [statusFilter, setStatusFilter] = useState<"all" | DraftStatus>("all");
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const toggleDetail = useCallback(() => setIsShowingDetail((prev) => !prev), []);

  const shouldLoadSocialSets = !props.socialSetId;
  const {
    data: socialSets,
    isLoading: isLoadingSocialSets,
    error: socialSetsError,
    revalidate: revalidateSocialSets,
  } = usePromise(listSocialSets, [], { execute: shouldLoadSocialSets });
  const socialSetOptions = socialSets ?? [];
  const groupedSocialSets = useMemo(() => groupSocialSetsByTeam(socialSetOptions), [socialSetOptions]);

  useEffect(() => {
    if (props.socialSetId) {
      setSelectedSocialSetId(props.socialSetId);
      return;
    }
    if (!selectedSocialSetId && (defaultSocialSetId || lastSocialSetId)) {
      setSelectedSocialSetId(defaultSocialSetId || lastSocialSetId || undefined);
    }
  }, [defaultSocialSetId, lastSocialSetId, props.socialSetId, selectedSocialSetId]);

  useEffect(() => {
    if (!selectedSocialSetId && socialSetOptions.length > 0) {
      const firstPersonal = socialSetOptions.find((s) => !s.team);
      setSelectedSocialSetId(String((firstPersonal ?? socialSetOptions[0]).id));
    }
  }, [selectedSocialSetId, socialSetOptions]);

  useEffect(() => {
    if (!selectedSocialSetId || socialSetOptions.length === 0) {
      return;
    }
    const isValid = socialSetOptions.some((socialSet) => String(socialSet.id) === selectedSocialSetId);
    if (!isValid) {
      setSelectedSocialSetId(String(socialSetOptions[0].id));
    }
  }, [selectedSocialSetId, socialSetOptions]);

  useEffect(() => {
    if (selectedSocialSetId) {
      setLastSocialSetId(selectedSocialSetId);
    }
  }, [selectedSocialSetId, setLastSocialSetId]);

  const socialSetId = props.socialSetId || selectedSocialSetId;
  const effectiveStatus = props.fixedStatus ?? (statusFilter === "all" ? undefined : statusFilter);

  const { data: tagsData } = usePromise(
    async (id?: string) => {
      if (!id) return undefined;
      return listTags(Number(id));
    },
    [socialSetId],
    { execute: Boolean(socialSetId) },
  );
  const tagNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (tagsData) {
      for (const tag of tagsData) {
        map.set(tag.slug, tag.name);
      }
    }
    return map;
  }, [tagsData]);

  const {
    data,
    isLoading: isLoadingDrafts,
    revalidate: revalidateDrafts,
    error,
  } = usePromise(
    async (id?: string, status?: DraftStatus) => {
      if (!id) {
        return undefined;
      }
      return listDrafts(Number(id), { status, limit: 50 });
    },
    [socialSetId, effectiveStatus],
    { execute: Boolean(socialSetId) },
  );

  const drafts = data?.results ?? [];
  const orderedDrafts = useMemo(() => {
    if (effectiveStatus !== "scheduled") {
      return drafts;
    }
    return [...drafts].sort((left, right) => {
      const leftTime = getScheduledSortTime(left);
      const rightTime = getScheduledSortTime(right);
      if (leftTime === undefined && rightTime === undefined) {
        return 0;
      }
      if (leftTime === undefined) {
        return 1;
      }
      if (rightTime === undefined) {
        return -1;
      }
      return leftTime - rightTime;
    });
  }, [drafts, effectiveStatus]);

  const showSocialSetDropdown = !props.socialSetId;
  const showStatusDropdown = Boolean(props.socialSetId) && !props.fixedStatus;
  const isLoading = isLoadingDrafts || (shouldLoadSocialSets && isLoadingSocialSets);
  const shouldHideStatus =
    effectiveStatus === "published" || effectiveStatus === "scheduled" || effectiveStatus === "draft";

  const emptyTitle = props.fixedStatus
    ? {
        draft: "No drafts",
        scheduled: "No scheduled drafts",
        published: "No published drafts",
        publishing: "No publishing drafts",
        error: "No draft errors",
      }[props.fixedStatus]
    : "No drafts";
  const emptyDescription =
    props.fixedStatus === "scheduled"
      ? "Scheduled drafts will appear here."
      : props.fixedStatus === "published"
        ? "Published drafts will appear here."
        : "Create your first draft.";
  const sectionTitle = props.fixedStatus
    ? {
        draft: "Drafts",
        scheduled: "Scheduled Drafts",
        published: "Published Drafts",
        publishing: "Publishing Drafts",
        error: "Draft Errors",
      }[props.fixedStatus]
    : "Drafts";

  const emptyView = !socialSetId ? (
    socialSetsError ? (
      <List.EmptyView
        title="Unable to load social sets"
        description={getErrorMessage(socialSetsError)}
        icon={Icon.Warning}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidateSocialSets} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    ) : socialSetOptions.length === 0 && !isLoadingSocialSets ? (
      <List.EmptyView
        title="No social sets"
        description="Create a social set in Typefully to get started."
        icon={Icon.Switch}
      />
    ) : (
      <List.EmptyView
        title="No social set selected"
        description="Pick a social set from the dropdown."
        icon={Icon.Switch}
        actions={
          <ActionPanel>
            <Action.Open title="Open Social Sets" target={SOCIAL_SETS_COMMAND_URL} icon={Icon.Switch} />
          </ActionPanel>
        }
      />
    )
  ) : error ? (
    <List.EmptyView
      title="Unable to load drafts"
      description={getErrorMessage(error)}
      icon={Icon.Warning}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidateDrafts} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : (
    <List.EmptyView
      title={emptyTitle}
      description={emptyDescription}
      icon={Icon.Pencil}
      actions={
        <ActionPanel>
          <Action.Push title="Create Draft" icon={Icon.Pencil} target={<CreateDraftForm socialSetId={socialSetId} />} />
          <Action.Open title="Open Social Sets" target={SOCIAL_SETS_COMMAND_URL} icon={Icon.Switch} />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search drafts"
      searchBarAccessory={
        showStatusDropdown ? (
          <List.Dropdown
            tooltip="Filter by status"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as "all" | DraftStatus)}
          >
            {DRAFT_STATUS_OPTIONS.map((option) => (
              <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </List.Dropdown>
        ) : showSocialSetDropdown ? (
          <List.Dropdown
            tooltip="Filter by social set"
            value={socialSetId ?? ""}
            onChange={(value) => setSelectedSocialSetId(value || undefined)}
          >
            <List.Dropdown.Item value="" title="Select a Social Set" />
            {groupedSocialSets.noTeam.length > 0 && (
              <List.Dropdown.Section title="Personal">
                {groupedSocialSets.noTeam.map((socialSet) => (
                  <List.Dropdown.Item
                    key={socialSet.id}
                    value={String(socialSet.id)}
                    title={`${socialSet.name} (@${socialSet.username})`}
                  />
                ))}
              </List.Dropdown.Section>
            )}
            {groupedSocialSets.teamOrder.map((teamId) => {
              const teamGroup = groupedSocialSets.teamMap.get(teamId);
              if (!teamGroup) return null;
              return (
                <List.Dropdown.Section key={teamId} title={teamGroup.name}>
                  {teamGroup.items.map((socialSet) => (
                    <List.Dropdown.Item
                      key={socialSet.id}
                      value={String(socialSet.id)}
                      title={`${socialSet.name} (@${socialSet.username})`}
                    />
                  ))}
                </List.Dropdown.Section>
              );
            })}
          </List.Dropdown>
        ) : undefined
      }
    >
      {orderedDrafts.length === 0 ? (
        emptyView
      ) : (
        <List.Section title={sectionTitle} subtitle={String(orderedDrafts.length)}>
          {orderedDrafts.map((draft) => (
            <DraftItem
              key={draft.id ?? draft.private_url}
              draft={draft}
              onRefresh={revalidateDrafts}
              socialSetId={socialSetId}
              hideStatus={shouldHideStatus}
              showScheduledTime={effectiveStatus === "scheduled"}
              isShowingDetail={isShowingDetail}
              onToggleDetail={toggleDetail}
              tagNameMap={tagNameMap}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command() {
  const { apiKey } = getPreferences();
  if (!apiKey) {
    return <ApiKeyRequiredView />;
  }
  return <DraftsList fixedStatus="draft" />;
}
