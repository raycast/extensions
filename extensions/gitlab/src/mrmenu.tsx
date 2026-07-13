import { Icon, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo } from "react";
import { useMyMergeRequests } from "./components/mr_my";
import { MRScope, MRState } from "./components/mr";
import { useMyReviews } from "./components/reviews";
import { MergeRequest } from "./gitlabapi";
import {
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
  MenuBarSubmenu,
} from "./components/menu";
import { GitLabIcons } from "./icons";
import { getBoundedPreferenceNumber, getPreferences, parseCommaSeparatedPreference } from "./utils";

async function launchReviewsCommand(): Promise<void> {
  try {
    return await launchCommand({ name: "reviews", type: LaunchType.UserInitiated });
  } catch (error) {
    showFailureToast(error, { title: "Could not open Reviews Command" });
  }
}

async function launchAssignedMergeRequests(): Promise<void> {
  try {
    return launchCommand({ name: "mr_my", type: LaunchType.UserInitiated });
  } catch (error) {
    showFailureToast(error, { title: "Could not open My Merge Requests Command" });
  }
}

async function launchCreatedMergeRequests(): Promise<void> {
  try {
    return launchCommand({
      name: "mr_my",
      type: LaunchType.UserInitiated,
      arguments: { scope: MRScope.created_by_me },
    });
  } catch (error) {
    showFailureToast(error, { title: "Could not open My Merge Requests Command" });
  }
}

function getMaxMergeRequestsPreference(): number {
  return getBoundedPreferenceNumber(getPreferences().maxitems);
}

function getShowItemsCountPreference(): boolean {
  return getPreferences().showtext ?? false;
}

export default function MenuCommand() {
  const {
    mrsAssigned,
    mrsReview,
    mrsCreated,
    isLoading,
    error,
    assignedLabelsFilter,
    createdLabelsFilter,
    reviewLabelsFilter,
  } = useMenuMergeRequests();
  const assignedCount = mrsAssigned?.length || 0;
  const reviewCount = mrsReview?.length || 0;
  const createdCount = mrsCreated?.length || 0;
  const totalCount = assignedCount + reviewCount + createdCount;

  const assignedFilterActive = assignedLabelsFilter.length > 0;
  const createdFilterActive = createdLabelsFilter.length > 0;
  const reviewFilterActive = reviewLabelsFilter.length > 0;

  return (
    <MenuBarRoot
      isLoading={isLoading}
      title={getShowItemsCountPreference() ? (totalCount <= 0 ? undefined : `${totalCount}`) : undefined}
      icon={{ source: GitLabIcons.merge_request, tintColor: { light: "#000", dark: "#FFF", adjustContrast: false } }}
      tooltip="GitLab Merge Requests"
      error={error}
    >
      <MenuBarExtra.Section title="Merge Requests">
        <MenuBarSubmenu
          title={`${createdFilterActive ? `[Filtered] ` : ``}My Merge Requests`}
          subtitle={`(${createdCount})`}
          icon={Icon.Terminal}
        >
          <MenuBarExtra.Section>
            <MenuBarItem
              title="Open My Merge Requests"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={() => launchCreatedMergeRequests()}
            />
            {createdFilterActive && (
              <MenuBarItem
                title={`Filter: ${createdLabelsFilter.join(", ")}`}
                icon={Icon.Tag}
                tooltip="Label filter is active"
              />
            )}
          </MenuBarExtra.Section>
          <MenuBarSection
            maxChildren={getMaxMergeRequestsPreference()}
            moreElement={(hidden) => (
              <MenuBarItem title={`... ${hidden} more created`} onAction={() => launchCreatedMergeRequests()} />
            )}
          >
            {mrsCreated?.map((mergeRequest) => (
              <MenuBarItem
                key={mergeRequest.id}
                icon={{
                  source: GitLabIcons.merge_request,
                  tintColor: { light: "#000", dark: "#FFF", adjustContrast: false },
                }}
                title={`!${mergeRequest.iid} ${mergeRequest.title}`}
                tooltip={mergeRequest.reference_full}
                onAction={() => open(mergeRequest.web_url)}
              />
            ))}
          </MenuBarSection>
        </MenuBarSubmenu>
        <MenuBarSubmenu
          title={`${assignedFilterActive ? `[Filtered] ` : ``}Assigned`}
          subtitle={`(${assignedCount})`}
          icon={Icon.Person}
        >
          <MenuBarExtra.Section>
            <MenuBarItem
              title="Open Assigned Merge Requests"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => launchAssignedMergeRequests()}
            />
            {assignedFilterActive && (
              <MenuBarItem
                title={`Filter: ${assignedLabelsFilter.join(", ")}`}
                icon={Icon.Tag}
                tooltip="Label filter is active"
              />
            )}
          </MenuBarExtra.Section>
          <MenuBarSection
            maxChildren={getMaxMergeRequestsPreference()}
            moreElement={(hidden) => (
              <MenuBarItem title={`... ${hidden} more assigned`} onAction={() => launchAssignedMergeRequests()} />
            )}
          >
            {mrsAssigned?.map((mergeRequest) => (
              <MenuBarItem
                key={mergeRequest.id}
                icon={{
                  source: GitLabIcons.merge_request,
                  tintColor: { light: "#000", dark: "#FFF", adjustContrast: false },
                }}
                title={`!${mergeRequest.iid} ${mergeRequest.title}`}
                tooltip={mergeRequest.reference_full}
                onAction={() => open(mergeRequest.web_url)}
              />
            ))}
          </MenuBarSection>
        </MenuBarSubmenu>
        <MenuBarSubmenu
          title={`${reviewFilterActive ? `[Filtered] ` : ``}Reviews`}
          subtitle={`(${reviewCount})`}
          icon={Icon.Checkmark}
        >
          <MenuBarSection>
            <MenuBarItem
              title="Open My Reviews"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => launchReviewsCommand()}
            />
            {reviewFilterActive && (
              <MenuBarItem
                title={`Filter: ${reviewLabelsFilter.join(", ")}`}
                icon={Icon.Tag}
                tooltip="Label filter is active"
              />
            )}
          </MenuBarSection>
          <MenuBarSection
            maxChildren={getMaxMergeRequestsPreference()}
            moreElement={(hidden) => (
              <MenuBarItem title={`... ${hidden} more to review`} onAction={() => launchReviewsCommand()} />
            )}
          >
            {mrsReview?.map((mergeRequest) => (
              <MenuBarItem
                key={mergeRequest.id}
                icon={{
                  source: GitLabIcons.merge_request,
                  tintColor: { light: "#000", dark: "#FFF", adjustContrast: false },
                }}
                title={`!${mergeRequest.iid} ${mergeRequest.title}`}
                tooltip={mergeRequest.reference_full}
                onAction={() => open(mergeRequest.web_url)}
              />
            ))}
          </MenuBarSection>
        </MenuBarSubmenu>
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarRoot>
  );
}

function useMenuMergeRequests(): {
  error?: string;
  isLoading: boolean;
  mrsAssigned?: MergeRequest[];
  mrsReview?: MergeRequest[];
  mrsCreated?: MergeRequest[];
  assignedLabelsFilter: string[];
  createdLabelsFilter: string[];
  reviewLabelsFilter: string[];
} {
  const preferences = useMemo(() => getPreferences(), []);
  const assignedLabelsFilter = useMemo(
    () => parseCommaSeparatedPreference(preferences.assignedLabels),
    [preferences.assignedLabels],
  );
  const reviewLabelsFilter = useMemo(
    () => parseCommaSeparatedPreference(preferences.reviewLabels),
    [preferences.reviewLabels],
  );
  const createdLabelsFilter = useMemo(
    () => parseCommaSeparatedPreference(preferences.createdLabels),
    [preferences.createdLabels],
  );

  const {
    mrs: mrsAssigned,
    isLoading: isLoadingAssigned,
    error: errorAssigned,
  } = useMyMergeRequests(
    MRScope.assigned_to_me,
    MRState.opened,
    undefined,
    assignedLabelsFilter,
    preferences.hideArchived === true,
  );
  const {
    mrs: mrsReview,
    isLoading: isLoadingReview,
    error: errorReview,
  } = useMyReviews(undefined, reviewLabelsFilter, preferences.hideArchived === true);
  const {
    mrs: mrsCreated,
    isLoading: isLoadingCreated,
    error: errorCreated,
  } = useMyMergeRequests(
    MRScope.created_by_me,
    MRState.opened,
    undefined,
    createdLabelsFilter,
    preferences.hideArchived === true,
  );
  const isLoading = isLoadingAssigned || isLoadingReview || isLoadingCreated;

  return {
    error: errorAssigned || errorReview || errorCreated,
    isLoading,
    mrsAssigned,
    mrsReview,
    mrsCreated,
    assignedLabelsFilter,
    createdLabelsFilter,
    reviewLabelsFilter,
  };
}
