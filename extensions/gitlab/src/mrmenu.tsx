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

function clipText(text: string) {
  const maxLength = 100;
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + " ...";
  }
  return text;
}

function shownMergeRequsets(mrs?: MergeRequest[]): { shown?: MergeRequest[]; hidden: number } {
  if (!mrs || mrs.length <= 0) {
    return { shown: undefined, hidden: 0 };
  }
  const maxShown = getMaxMergeRequestsPreference();
  const shown = mrs.slice(0, maxShown);
  const hidden = mrs.length - shown.length;
  return { shown, hidden };
}

function MenuBarItem(props: {
  title: string;
  icon?: Image.ImageLike;
  shortcut?: Keyboard.Shortcut | undefined;
  onAction?: ((event: object) => void) | undefined;
  tooltip?: string;
}): JSX.Element {
  return (
    <MenuBarExtra.Item
      title={clipText(props.title)}
      icon={props.icon}
      shortcut={props.shortcut}
      onAction={props.onAction}
      tooltip={props.tooltip}
    />
  );
}

export default function MenuCommand(): JSX.Element {
  const { mrsAssigned: mrsAssignedAll, mrsReview: mrsReviewsAll, isLoading, error } = useMenuMergeRequests();
  if (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: error });
  }
  const assignedCount = mrsAssignedAll?.length || 0;
  const reviewCount = mrsReviewsAll?.length || 0;
  const totalCount = assignedCount + reviewCount;

  const { shown: mrsAssigned, hidden: mrsAssignedHiddenCount } = shownMergeRequsets(mrsAssignedAll);
  const { shown: mrsReviews, hidden: mrsReviewHiddenCount } = shownMergeRequsets(mrsReviewsAll);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      title={getShowItemsCountPreference() ? (totalCount <= 0 ? undefined : `${totalCount}`) : undefined}
      icon={{ source: "mropen.png", tintColor: Color.PrimaryText }}
      tooltip="GitLab Merge Requests"
    >
      <MenuBarExtra.Section title="Merge Requests">
        <MenuBarExtra.Submenu title={`Assigned (${assignedCount})`} icon={Icon.Person}>
          <MenuBarExtra.Section>
            <MenuBarItem
              title="Open Assigned Merge Requests"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => launchCommand({ name: "mr_my", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            {mrsAssigned?.map((m) => (
              <MenuBarItem
                icon={"mropen.png"}
                title={`!${m.iid} ${m.title}`}
                tooltip={m.reference_full}
                onAction={() => open(m.web_url)}
              />
            ))}
            {mrsAssignedHiddenCount > 0 && (
              <MenuBarItem
                title={`... ${mrsAssignedHiddenCount} more assigned`}
                onAction={() => launchCommand({ name: "mr_my", type: LaunchType.UserInitiated })}
              />
            )}
          </MenuBarExtra.Section>
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Submenu title={`Reviews (${reviewCount})`} icon={Icon.Checkmark}>
          <MenuBarExtra.Section>
            <MenuBarItem
              title="Open My Reviews"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => launchCommand({ name: "reviews", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            {mrsReviews?.map((m) => (
              <MenuBarItem
                icon={"mropen.png"}
                title={`!${m.iid} ${m.title}`}
                tooltip={m.reference_full}
                onAction={() => open(m.web_url)}
              />
            ))}
            {mrsReviewHiddenCount > 0 && (
              <MenuBarItem
                title={`... ${mrsAssignedHiddenCount} more to review`}
                onAction={() => launchCommand({ name: "reviews", type: LaunchType.UserInitiated })}
              />
            )}
          </MenuBarExtra.Section>
        </MenuBarExtra.Submenu>
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
