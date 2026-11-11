import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import type { ReactNode } from "react";
import { useGt } from "../hooks/use-gt";
import { mergeWithGraphite } from "../lib/api";
import { celebrate } from "../lib/celebrate";
import { PullRequestRef, PullRequestStatus, submitReview } from "../lib/github";
import { isReadyToMerge } from "../lib/indicators";
import { planMerge } from "../lib/merge-plan";
import { PullRequestLinks } from "../lib/presentation";
import { findGraphiteRepositories, findRepositoryForSlug } from "../lib/repositories";
import { ReviewForm } from "./review-form";

export const SHORTCUTS = {
  toggleDetails: { modifiers: ["cmd"], key: "i" },
  checkOut: { modifiers: ["cmd", "shift"], key: "g" },
  copyCheckoutCommand: { modifiers: ["cmd", "opt"], key: "c" },
  openOnGitHub: { modifiers: ["cmd"], key: "g" },
  // Copy shortcuts match Raycast's GitHub extension, so muscle memory carries over.
  copyLink: { modifiers: ["cmd", "shift"], key: "," },
  copyTitle: { modifiers: ["ctrl", "shift"], key: "," },
  copyNumber: { modifiers: ["cmd", "shift"], key: "." },
  copyMarkdownLink: { modifiers: ["cmd", "shift"], key: ";" },
  approve: { modifiers: ["cmd", "shift"], key: "a" },
  approveWithComment: { modifiers: ["cmd", "opt"], key: "a" },
  requestChanges: { modifiers: ["cmd", "shift"], key: "x" },
  comment: { modifiers: ["cmd", "shift"], key: "k" },
  merge: { modifiers: ["cmd", "shift"], key: "enter" },
  configureSections: { modifiers: ["cmd", "shift"], key: "s" },
} satisfies Record<string, Keyboard.Shortcut>;

export function ToggleDetailsAction(props: { isShowingDetail: boolean; onToggle: () => void }) {
  return (
    <Action
      title={props.isShowingDetail ? "Hide Side Panel" : "Show Side Panel"}
      icon={Icon.Sidebar}
      shortcut={SHORTCUTS.toggleDetails}
      onAction={props.onToggle}
    />
  );
}

export function RefreshAction(props: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={props.onRefresh}
    />
  );
}

/**
 * Opens the PR in the preferred website first. Raycast gives the first two actions ↵ and ⌘↵ and ignores custom
 * shortcuts there, so GitHub only gets ⌘G when it's listed on its own as the other website, after those two.
 */
export function OpenPullRequestActions(props: { links: PullRequestLinks; which?: "primary" | "secondary" | "both" }) {
  const { links } = props;
  const githubIsPreferred = links.primary === links.github;
  const graphite = <Action.OpenInBrowser key="graphite" title="Open in Graphite" url={links.graphite} />;
  const github = (
    <Action.OpenInBrowser
      key="github"
      title="Open on GitHub"
      url={links.github}
      shortcut={props.which === "secondary" ? SHORTCUTS.openOnGitHub : undefined}
    />
  );
  const [primary, secondary] = githubIsPreferred ? [github, graphite] : [graphite, github];
  return <>{props.which === "primary" ? primary : props.which === "secondary" ? secondary : [primary, secondary]}</>;
}

async function approve(pullRequest: PullRequestRef, title: string, onChanged: () => void) {
  const confirmed = await confirmAlert({
    title: `Approve #${pullRequest.number}?`,
    message: title,
    primaryAction: { title: "Approve" },
    rememberUserChoice: true,
  });
  if (!confirmed) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: `Approving #${pullRequest.number}…` });
  try {
    await submitReview(pullRequest, "approve");
    toast.style = Toast.Style.Success;
    toast.title = `Approved #${pullRequest.number}`;
    onChanged();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't approve #${pullRequest.number}`;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function merge(pullRequest: PullRequestRef, links: PullRequestLinks, onChanged: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Looking up the stack…" });
  try {
    const { trunk, pullRequests } = await planMerge(pullRequest);
    toast.hide();
    const multiple = pullRequests.length > 1;
    const summary = pullRequests
      .map((pr) => `#${pr.number} ${pr.title.length > 60 ? `${pr.title.slice(0, 59)}…` : pr.title}`)
      .join("\n");
    const confirmed = await confirmAlert({
      title: `Merge #${pullRequest.number} into ${trunk}?`,
      message: `${summary}\n\nGraphite merges them in this order into ${trunk}, through the merge queue if the repository uses one.`,
      primaryAction: {
        title: multiple ? `Merge ${pullRequests.length} PRs` : "Merge",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    toast.style = Toast.Style.Animated;
    toast.title = "Starting merge…";
    toast.show();
    await mergeWithGraphite(
      pullRequest.owner,
      pullRequest.repo,
      trunk,
      pullRequests.map((pr) => pr.number),
    );
    toast.style = Toast.Style.Success;
    toast.title = multiple ? `Merging ${pullRequests.length} PRs` : `Merging #${pullRequest.number}`;
    toast.message = "Graphite is merging in the background";
    toast.primaryAction = { title: "Open in Graphite", onAction: () => open(links.graphite) };
    if (getPreferenceValues<Preferences>().celebrateMerges) await celebrate();
    onChanged();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `Couldn't merge #${pullRequest.number}`;
    toast.message = error instanceof Error ? error.message : String(error);
    toast.show();
  }
}

export type PullRequestActionPanelProps = {
  pullRequest: PullRequestRef;
  title: string;
  links: PullRequestLinks;
  githubAvailable: boolean;
  status: PullRequestStatus | undefined;
  mergeability: string | undefined;
  onChanged: () => void;
  /** Actions that open or present the PR, in priority order. The first one runs on ↵, the second on ⌘↵. */
  openActions: ReactNode;
  extraActions?: ReactNode;
};

export function PullRequestActionPanel(props: PullRequestActionPanelProps) {
  const { pullRequest, title, links, githubAvailable, status, mergeability, onChanged, openActions, extraActions } =
    props;
  const run = useGt(onChanged);
  const canReview = !status?.viewerDidAuthor;
  const { number } = pullRequest;

  return (
    <ActionPanel title={`#${number} in ${pullRequest.owner}/${pullRequest.repo}`}>
      <ActionPanel.Section>{openActions}</ActionPanel.Section>
      <ActionPanel.Section title="Review">
        {githubAvailable ? (
          <>
            {canReview ? (
              <>
                <Action
                  title="Approve"
                  icon={Icon.CheckCircle}
                  shortcut={SHORTCUTS.approve}
                  onAction={() => approve(pullRequest, title, onChanged)}
                />
                <Action.Push
                  title="Approve with Comment…"
                  icon={Icon.CheckCircle}
                  shortcut={SHORTCUTS.approveWithComment}
                  target={<ReviewForm pullRequest={pullRequest} title={title} kind="approve" onReviewed={onChanged} />}
                />
                <Action.Push
                  title="Request Changes…"
                  icon={Icon.ExclamationMark}
                  shortcut={SHORTCUTS.requestChanges}
                  target={
                    <ReviewForm pullRequest={pullRequest} title={title} kind="request-changes" onReviewed={onChanged} />
                  }
                />
              </>
            ) : null}
            <Action.Push
              title="Comment…"
              icon={Icon.SpeechBubble}
              shortcut={SHORTCUTS.comment}
              target={<ReviewForm pullRequest={pullRequest} title={title} kind="comment" onReviewed={onChanged} />}
            />
            {isReadyToMerge(mergeability) ? (
              <Action
                title="Merge with Graphite"
                icon={Icon.ArrowRightCircle}
                style={Action.Style.Destructive}
                shortcut={SHORTCUTS.merge}
                onAction={() => merge(pullRequest, links, onChanged)}
              />
            ) : null}
          </>
        ) : (
          <Action.OpenInBrowser title="Set up GitHub CLI to Review" url="https://cli.github.com" />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Check out Locally"
          icon={Icon.Download}
          shortcut={SHORTCUTS.checkOut}
          onAction={async () => {
            const { owner, repo } = pullRequest;
            const searching = await showToast({ style: Toast.Style.Animated, title: `Finding ${repo} on this Mac…` });
            const repository = findRepositoryForSlug(await findGraphiteRepositories(), owner, repo);
            if (!repository) {
              searching.style = Toast.Style.Failure;
              searching.title = `No local clone of ${owner}/${repo}`;
              searching.message = 'Add the folder that holds it to "Repository Folders" in the extension preferences.';
              searching.primaryAction = { title: "Open Extension Preferences", onAction: openExtensionPreferences };
              return;
            }
            await searching.hide();
            await run(repository, {
              args: ["get", String(number)],
              progress: `Checking out #${number}`,
              success: `Checked out #${number}`,
              failure: `Couldn't check out #${number}`,
              confirm: {
                title: `Check Out #${number}?`,
                message: `Fetches the pull request's stack into ${repository.path} and switches to it.`,
                button: "Check Out",
              },
            });
          }}
        />
        <Action.CopyToClipboard title="Copy Pull Request URL" content={links.primary} shortcut={SHORTCUTS.copyLink} />
        <Action.CopyToClipboard title="Copy Pull Request Title" content={title} shortcut={SHORTCUTS.copyTitle} />
        <Action.CopyToClipboard
          title="Copy Pull Request Number"
          content={`#${number}`}
          shortcut={SHORTCUTS.copyNumber}
        />
        <Action.CopyToClipboard
          title="Copy Markdown Link"
          content={`[${title} (#${number})](${links.primary})`}
          shortcut={SHORTCUTS.copyMarkdownLink}
        />
        <Action.CopyToClipboard
          title="Copy Checkout Command"
          content={`gt get ${number}`}
          shortcut={SHORTCUTS.copyCheckoutCommand}
        />
      </ActionPanel.Section>
      {extraActions}
      <ActionPanel.Section>
        <RefreshAction onRefresh={onChanged} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
