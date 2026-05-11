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
import type { SocialSetListItem } from "../lib/types";
import { getErrorMessage } from "../lib/utils";
import { CreateDraftForm } from "./create-draft";
import { DraftItem } from "./drafts-components";
import { getScheduledSortTime } from "./drafts-helpers";

const SOCIAL_SETS_COMMAND_URL = `raycast://extensions/${encodeURIComponent(
  environment.ownerOrAuthorName,
)}/${encodeURIComponent(environment.extensionName)}/social-sets`;

function getSocialSetUsername(socialSet: SocialSetListItem) {
  return (
    socialSet.twitter?.username ||
    socialSet.linkedin?.vanity_name ||
    socialSet.instagram?.username ||
    socialSet.tiktok?.username ||
    socialSet.account_owner
  );
}

function parseAccountId(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

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
  const groupedSocialSets = useMemo(() => {
    const noTeam = socialSetOptions.filter((socialSet) => !socialSet.teams || socialSet.teams.length === 0);
    const withTeam = socialSetOptions.filter((socialSet) => socialSet.teams && socialSet.teams.length > 0);
    return { noTeam, withTeam };
  }, [socialSetOptions]);

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
      const firstPersonal = socialSetOptions.find((s) => !s.teams || s.teams.length === 0);
      setSelectedSocialSetId(String((firstPersonal ?? socialSetOptions[0]).account_id));
    }
  }, [selectedSocialSetId, socialSetOptions]);

  useEffect(() => {
    if (!selectedSocialSetId || socialSetOptions.length === 0) {
      return;
    }
    const isValid = socialSetOptions.some((socialSet) => String(socialSet.account_id) === selectedSocialSetId);
    if (!isValid) {
      setSelectedSocialSetId(String(socialSetOptions[0].account_id));
    }
  }, [selectedSocialSetId, socialSetOptions]);

  useEffect(() => {
    if (selectedSocialSetId) {
      setLastSocialSetId(selectedSocialSetId);
    }
  }, [selectedSocialSetId, setLastSocialSetId]);

  const socialSetId = props.socialSetId || selectedSocialSetId;
  const socialSetAccountId = parseAccountId(socialSetId);
  const effectiveStatus = props.fixedStatus ?? (statusFilter === "all" ? undefined : statusFilter);

  const { data: tagsData } = usePromise(
    async (id?: string) => {
      const accountId = parseAccountId(id);
      if (!accountId) return undefined;
      return listTags(accountId);
    },
    [socialSetId],
    { execute: Boolean(socialSetAccountId) },
  );
  const tagNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (tagsData) {
      for (const tag of tagsData) {
        map.set(tag.tag, tag.tag);
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
      const accountId = parseAccountId(id);
      if (!accountId) {
        return undefined;
      }
      return listDrafts(accountId, { status, limit: 50 });
    },
    [socialSetId, effectiveStatus],
    { execute: Boolean(socialSetAccountId) },
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
        description="Create a social set in Postey to get started."
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
                    key={socialSet.account_id}
                    value={String(socialSet.account_id)}
                    title={`${socialSet.account_name} (@${getSocialSetUsername(socialSet)})`}
                  />
                ))}
              </List.Dropdown.Section>
            )}
            {groupedSocialSets.withTeam.length > 0 && (
              <List.Dropdown.Section title="Team Accounts">
                {groupedSocialSets.withTeam.map((socialSet) => (
                  <List.Dropdown.Item
                    key={socialSet.account_id}
                    value={String(socialSet.account_id)}
                    title={`${socialSet.account_name} (@${getSocialSetUsername(socialSet)})`}
                  />
                ))}
              </List.Dropdown.Section>
            )}
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
