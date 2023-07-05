import {
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  Toast,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
  showToast,
} from "@raycast/api";
import { useMyMergeRequests } from "./components/mr_my";
import { MRScope, MRState } from "./components/mr";
import { useMyReviews } from "./components/reviews";
import { MergeRequest } from "./gitlabapi";
import { MenuBarItem, MenuBarSection, MenuBarSubmenu } from "./components/menu";

function getMaxMergeRequestsPreference(): number {
  const prefs = getPreferenceValues();
  const maxtext = (prefs.maxitems as string) || "";
  const max = Number(maxtext);
  if (isNaN(max)) {
    return 10;
  }
  if (max < 1) {
    return 10;
  }
  if (max > 100) {
    return 10;
  }
  return max;
}

function getShowItemsCountPreference(): boolean {
  const prefs = getPreferenceValues();
  const result = prefs.showtext as boolean;
  return result;
}

export default function MenuCommand(): JSX.Element {
  const { mrsAssigned, mrsReview, isLoading, error } = useMenuMergeRequests();
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  const assignedCount = mrsAssigned?.length || 0;
  const reviewCount = mrsReview?.length || 0;
  const totalCount = assignedCount + reviewCount;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={getShowItemsCountPreference() ? (totalCount <= 0 ? undefined : `${totalCount}`) : undefined}
      icon={{ source: "mropen.png", tintColor: Color.PrimaryText }}
      tooltip="GitLab Merge Requests"
    >
      <MenuBarExtra.Section title="Merge Requests">
        <MenuBarSubmenu title={`Assigned`} subtitle={`(${assignedCount})`} icon={Icon.Person}>
          <MenuBarExtra.Section>
            <MenuBarItem
              title="Open Assigned Merge Requests"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => launchCommand({ name: "mr_my", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
          <MenuBarSection
            maxChildren={getMaxMergeRequestsPreference()}
            moreElement={(hidden) => (
              <MenuBarItem
                title={`... ${hidden} more assigned`}
                onAction={() => launchCommand({ name: "mr_my", type: LaunchType.UserInitiated })}
              />
            )}
          >
            {mrsAssigned?.map((m) => (
              <MenuBarItem
                icon={"mropen.png"}
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
              onAction={() => launchCommand({ name: "reviews", type: LaunchType.UserInitiated })}
            />
          </MenuBarSection>
          <MenuBarSection
            maxChildren={getMaxMergeRequestsPreference()}
            moreElement={(hidden) => (
              <MenuBarItem
                title={`... ${hidden} more to review`}
                onAction={() => launchCommand({ name: "reviews", type: LaunchType.UserInitiated })}
              />
            )}
          >
            {mrsReview?.map((m) => (
              <MenuBarItem
                icon={"mropen.png"}
                title={`!${m.iid} ${m.title}`}
                tooltip={m.reference_full}
                onAction={() => open(m.web_url)}
              />
            ))}
          </MenuBarSection>
        </MenuBarSubmenu>
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          icon={Icon.Gear}
          onAction={() => openCommandPreferences()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
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
