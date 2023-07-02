import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  Toast,
  launchCommand,
  open,
  openCommandPreferences,
  showToast,
} from "@raycast/api";
import { useMyMergeRequests } from "./components/mr_my";
import { MRScope, MRState } from "./components/mr";
import { useMyReviews } from "./components/reviews";
import { MergeRequest } from "./gitlabapi";

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
      title={totalCount <= 0 ? undefined : `${totalCount}`}
      icon={{ source: "mropen.png", tintColor: Color.PrimaryText }}
      tooltip="GitLab Merge Requests"
    >
      <MenuBarExtra.Section title="Merge Requests">
        <MenuBarExtra.Submenu title={`Assigned (${assignedCount})`} icon={Icon.Person}>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Open Assigned Merge Requests"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              onAction={() => launchCommand({ name: "mr_my", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            {mrsAssigned?.map((m) => (
              <MenuBarExtra.Item
                icon={"mropen.png"}
                title={`!${m.iid} ${m.title}`}
                tooltip={m.reference_full}
                onAction={() => open(m.web_url)}
              />
            ))}
          </MenuBarExtra.Section>
        </MenuBarExtra.Submenu>
        <MenuBarExtra.Submenu title={`Reviews (${reviewCount})`} icon={Icon.Checkmark}>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Open My Reviews"
              icon={Icon.Terminal}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => launchCommand({ name: "reviews", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            {mrsReview?.map((m) => (
              <MenuBarExtra.Item
                icon={"mropen.png"}
                title={`!${m.iid} ${m.title}`}
                tooltip={m.reference_full}
                onAction={() => open(m.web_url)}
              />
            ))}
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
