import { ActionPanel, Action, List, Icon, Color, Image, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchPRExtraInfo } from "../github/extra-info";
import { approvePullRequest } from "../github/actions";
import { getRepoName } from "../github/utils";
import { PullRequest } from "../github/types/pr";
import { MyReviewActivity } from "../github/types/reviews";
import { getListAccessories } from "./utils/accessories";
import { PRDetail } from "./PRDetail";
import { RequestChangesForm } from "./RequestChangesForm";
import { Category } from "./types";

export type { Category };

export function PullRequestItem({
  pr,
  category,
  myActivity,
  onRevalidate,
  preferences,
  onToggleDetail,
}: {
  pr: PullRequest;
  category: Category;
  myActivity?: MyReviewActivity;
  onRevalidate: () => void;
  preferences: Preferences;
  onToggleDetail: () => void;
}) {
  const { push } = useNavigation();
  const repoName = getRepoName(pr);
  const isMyPR = category !== "new-review-request" && category !== "in-review";

  const { data: extraInfo } = useCachedPromise(fetchPRExtraInfo, [
    preferences.githubEnterpriseUrl,
    preferences.githubToken,
    repoName,
    pr.number,
  ]);

  async function handleApprove() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Approving PR..." });
    try {
      await approvePullRequest(preferences.githubEnterpriseUrl, preferences.githubToken, repoName, pr.number);
      toast.style = Toast.Style.Success;
      toast.title = "PR approved";
      onRevalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to approve PR";
      toast.message = String(err);
    }
  }

  return (
    <List.Item
      title={pr.title}
      icon={{ source: pr.user.avatar_url, mask: Image.Mask.Circle }}
      accessories={getListAccessories(pr, extraInfo, isMyPR, myActivity)}
      detail={<PRDetail pr={pr} repoName={repoName} extraInfo={extraInfo} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={pr.html_url} />
            <Action
              title="Toggle Detail"
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={onToggleDetail}
            />
            <Action.CopyToClipboard
              title="Copy PR URL"
              content={pr.html_url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy PR Number"
              content={`#${pr.number}`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Review">
            <Action
              title="Approve"
              icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={handleApprove}
            />
            <Action
              title="Request Changes"
              icon={{ source: Icon.Pencil, tintColor: Color.Orange }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={() =>
                push(
                  <RequestChangesForm pr={pr} repoName={repoName} preferences={preferences} onSubmit={onRevalidate} />,
                )
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onRevalidate}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
