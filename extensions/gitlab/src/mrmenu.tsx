import { Color, Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand, open } from "@raycast/api";
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
  getBoundedPreferenceNumber,
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

function getMaxMergeRequestsPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function getShowItemsCountPreference(): boolean {
  const prefs = getPreferenceValues();
  const result = prefs.showtext as boolean;
  return result;
}

export default function MenuCommand(): JSX.Element {
  const { mrsAssigned, mrsReview, isLoading, error } = useMenuMergeRequests();
  const assignedCount = mrsAssigned?.length || 0;
  const reviewCount = mrsReview?.length || 0;
  const totalCount = assignedCount + reviewCount;

  return (
    <MenuBarRoot
      isLoading={isLoading}
      title={getShowItemsCountPreference() ? (totalCount <= 0 ? undefined : `${totalCount}`) : undefined}
      icon={{ source: GitLabIcons.merge_request, tintColor: { light: "#000", dark: "#FFF", adjustContrast: false } }}
      tooltip="GitLab Merge Requests"
      error={error}
    >
      <MenuBarExtra.Section title="Merge Requests">
        <MenuBarSubmenu title={`Assigned`} subtitle={`(${assignedCount})`} icon={Icon.Person}>
          <MenuBarExtra.Section>
            <MenuBarItem
              title="Open Assigned Merge Requests"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => launchAssignedMergeRequests()}
            />
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
        <MenuBarSubmenu title={`Reviews`} subtitle={`(${reviewCount})`} icon={Icon.Checkmark}>
          <MenuBarSection>
            <MenuBarItem
              title="Open My Reviews"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => launchReviewsCommand()}
            />
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
} {
  const {
    mrs: mrsAssigned,
    isLoading: isLoadingAssigned,
    error: errorAssigned,
  } = useMyMergeRequests(MRScope.assigned_to_me, MRState.opened, undefined);
  const { mrs: mrsReview, isLoading: isLoadingReview, error: errorReview } = useMyReviews();
  const isLoading = isLoadingAssigned || isLoadingReview;

  return {
    error: errorAssigned || errorReview,
    isLoading,
    mrsAssigned: isLoading ? undefined : mrsAssigned,
    mrsReview: isLoading ? undefined : mrsReview,
  };
}
