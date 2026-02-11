import { getPreferenceValues, Icon, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api";
import { useMemo } from "react";
import { useMyMergeRequests } from "./components/mr_my";
import { MRScope, MRState } from "./components/mr";
import { useMyReviews } from "./components/reviews";
import { MergeRequest } from "./gitlabapi";
import {
  getBoundedPreferenceNumber,
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
  MenuBarSubmenu,
} from "./components/menu";
import { GitLabIcons } from "./icons";
import { getErrorMessage, showErrorToast } from "./utils";

async function launchReviewsCommand(): Promise<void> {
  try {
    return await launchCommand({ name: "reviews", type: LaunchType.UserInitiated });
  } catch (error) {
    showErrorToast(getErrorMessage(error), "Could not open Reviews Command");
  }
}

async function launchAssignedMergeRequests(): Promise<void> {
  try {
    return launchCommand({ name: "mr_my", type: LaunchType.UserInitiated });
  } catch (error) {
    showErrorToast(getErrorMessage(error), "Could not open My Merge Requests Command");
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
    showErrorToast(getErrorMessage(error), "Could not open My Merge Requests Command");
  }
}

function getMaxMergeRequestsPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function getShowItemsCountPreference(): boolean {
  const prefs = getPreferenceValues();
  return prefs.showtext as boolean;
}

function getLabelFilterPreference(preferenceName: string): string[] {
  const prefs = getPreferenceValues();
  const labelsString = (prefs[preferenceName] as string) || "";
  return labelsString
    .split(",")
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
}

function getAssignedLabelsPreference(): string[] {
  return getLabelFilterPreference("assignedLabels");
}

function getCreatedLabelsPreference(): string[] {
  return getLabelFilterPreference("createdLabels");
}

function getReviewLabelsPreference(): string[] {
  return getLabelFilterPreference("reviewLabels");
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
            {mrsCreated?.map((m) => (
              <MenuBarItem
                icon={{
                  source: GitLabIcons.merge_request,
                  tintColor: { light: "#000", dark: "#FFF", adjustContrast: false },
                }}
                title={`!${m.iid} ${m.title}`}
                tooltip={m.reference_full}
                onAction={() => open(m.web_url)}
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
            {mrsAssigned?.map((m) => (
              <MenuBarItem
                icon={{
                  source: GitLabIcons.merge_request,
                  tintColor: { light: "#000", dark: "#FFF", adjustContrast: false },
                }}
                title={`!${m.iid} ${m.title}`}
                tooltip={m.reference_full}
                onAction={() => open(m.web_url)}
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
            {mrsReview?.map((m) => (
              <MenuBarItem
                icon={{
                  source: GitLabIcons.merge_request,
                  tintColor: { light: "#000", dark: "#FFF", adjustContrast: false },
                }}
                title={`!${m.iid} ${m.title}`}
                tooltip={m.reference_full}
                onAction={() => open(m.web_url)}
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
  const assignedLabelsFilter = useMemo(() => getAssignedLabelsPreference(), []);
  const reviewLabelsFilter = useMemo(() => getReviewLabelsPreference(), []);
  const createdLabelsFilter = useMemo(() => getCreatedLabelsPreference(), []);

  const {
    mrs: mrsAssigned,
    isLoading: isLoadingAssigned,
    error: errorAssigned,
  } = useMyMergeRequests(MRScope.assigned_to_me, MRState.opened, undefined, assignedLabelsFilter);
  const {
    mrs: mrsReview,
    isLoading: isLoadingReview,
    error: errorReview,
  } = useMyReviews(undefined, reviewLabelsFilter);
  const {
    mrs: mrsCreated,
    isLoading: isLoadingCreated,
    error: errorCreated,
  } = useMyMergeRequests(MRScope.created_by_me, MRState.opened, undefined, createdLabelsFilter);
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
