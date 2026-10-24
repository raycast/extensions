import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import {
  CheckStatus,
  GhAvailability,
  GitHubRepo,
  Issue,
  PullRequest,
  ghAvailability,
  listAssignedIssues,
  listPullRequests,
  listReviewRequests,
  resolveGitHubRepo,
} from "../github";
import { checkoutPullRequestAsWorktree } from "../prCheckout";
import { AgentPicker, openInTerminal, openUrl } from "../vibe";

type State = {
  loading: boolean;
  availability: GhAvailability | undefined;
  repo: GitHubRepo | undefined;
  prs: PullRequest[];
  issues: Issue[];
  reviews: PullRequest[];
};

const initialState: State = {
  loading: true,
  availability: undefined,
  repo: undefined,
  prs: [],
  issues: [],
  reviews: [],
};

const CHECK_ICONS: Record<CheckStatus, { source: Icon; tintColor?: Color }> = {
  success: { source: Icon.CheckCircle, tintColor: Color.Green },
  failure: { source: Icon.XMarkCircle, tintColor: Color.Red },
  pending: { source: Icon.Hourglass, tintColor: Color.Yellow },
  neutral: { source: Icon.CircleProgress50 },
  none: { source: Icon.Circle },
};

export function GitHubDashboard({ repoRoot }: { repoRoot: string }) {
  const [state, setState] = React.useState<State>(initialState);

  const load = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    const availability = await ghAvailability();
    if (availability !== "ok") {
      setState({ ...initialState, loading: false, availability });
      return;
    }
    const repo = await resolveGitHubRepo(repoRoot);
    if (!repo) {
      setState({
        ...initialState,
        loading: false,
        availability,
        repo: undefined,
      });
      return;
    }
    const [prs, issues, reviews] = await Promise.all([
      listPullRequests(repoRoot, repo).catch(async (error: unknown) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load pull requests",
          message: error instanceof Error ? error.message : String(error),
        });
        return [];
      }),
      listAssignedIssues(repoRoot, repo).catch(async (error: unknown) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load assigned issues",
          message: error instanceof Error ? error.message : String(error),
        });
        return [];
      }),
      listReviewRequests(repoRoot, repo).catch(async (error: unknown) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load review requests",
          message: error instanceof Error ? error.message : String(error),
        });
        return [];
      }),
    ]);
    setState({ loading: false, availability, repo, prs, issues, reviews });
  }, [repoRoot]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (!state.loading && state.availability === "missing") {
    return (
      <List navigationTitle="GitHub">
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="GitHub CLI not installed"
          description="Install gh from https://cli.github.com/ and reopen this view."
          actions={
            <ActionPanel>
              <Action
                title="Open Install Docs"
                icon={Icon.Globe}
                onAction={() => void openUrl("https://cli.github.com/")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!state.loading && state.availability === "unauthenticated") {
    return (
      <List navigationTitle="GitHub">
        <List.EmptyView
          icon={Icon.Key}
          title="GitHub CLI not authenticated"
          description="Run gh auth login in a terminal, then reopen this view."
          actions={
            <ActionPanel>
              <Action
                title="Open Terminal Here"
                icon={Icon.Terminal}
                onAction={() => void openInTerminal(repoRoot, "gh auth login")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!state.loading && !state.repo) {
    return (
      <List navigationTitle="GitHub">
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No GitHub remote"
          description="This repository has no origin remote pointing to github.com."
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="GitHub"
      searchBarPlaceholder="Search…"
      isLoading={state.loading}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => void load()}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Open Pull Requests">
        {state.prs.map((pr) => (
          <PullRequestItem
            key={`pr-${pr.number}`}
            pr={pr}
            onRefresh={load}
            repoRoot={repoRoot}
          />
        ))}
      </List.Section>
      <List.Section title="My Assigned Issues">
        {state.issues.map((issue) => (
          <IssueItem
            key={`issue-${issue.number}`}
            issue={issue}
            onRefresh={load}
          />
        ))}
      </List.Section>
      <List.Section title="Reviews Requested">
        {state.reviews.map((pr) => (
          <PullRequestItem
            key={`review-${pr.number}`}
            pr={pr}
            onRefresh={load}
            repoRoot={repoRoot}
          />
        ))}
      </List.Section>
    </List>
  );
}

function PullRequestItem({
  pr,
  onRefresh,
  repoRoot,
}: {
  pr: PullRequest;
  onRefresh: () => Promise<void>;
  repoRoot: string;
}) {
  const { push } = useNavigation();

  const checkoutAsWorktree = async () => {
    await showToast({
      style: Toast.Style.Animated,
      title: `Checking out PR #${pr.number}…`,
    });
    try {
      const { worktreePath } = await checkoutPullRequestAsWorktree(
        repoRoot,
        pr,
      );
      await showToast({
        style: Toast.Style.Success,
        title: `Checked out PR #${pr.number}`,
        message: worktreePath,
      });
      push(
        <AgentPicker
          folder={{ name: `pr-${pr.number}`, path: worktreePath }}
          onRefresh={onRefresh}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not check out PR",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const accessories: {
    text?: string;
    icon?: { source: Icon; tintColor?: Color };
  }[] = [];
  accessories.push({ icon: CHECK_ICONS[pr.checks] });
  if (pr.isDraft) accessories.push({ text: "draft" });
  accessories.push({ text: pr.headRefName });
  return (
    <List.Item
      icon={pr.isDraft ? Icon.Document : Icon.CodeBlock}
      title={`#${pr.number} ${pr.title}`}
      subtitle={pr.author ? `@${pr.author}` : ""}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            onAction={() => void openUrl(pr.url)}
          />
          <Action.CopyToClipboard title="Copy URL" content={pr.url} />
          <Action.CopyToClipboard
            title="Copy Branch Name"
            content={pr.headRefName}
          />
          <Action
            title="Check out as Worktree"
            icon={Icon.Tree}
            onAction={() => void checkoutAsWorktree()}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => void onRefresh()}
          />
        </ActionPanel>
      }
    />
  );
}

function IssueItem({
  issue,
  onRefresh,
}: {
  issue: Issue;
  onRefresh: () => Promise<void>;
}) {
  return (
    <List.Item
      icon={Icon.Bug}
      title={`#${issue.number} ${issue.title}`}
      actions={
        <ActionPanel>
          <Action
            title="Open in Browser"
            icon={Icon.Globe}
            onAction={() => void openUrl(issue.url)}
          />
          <Action.CopyToClipboard title="Copy URL" content={issue.url} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={() => void onRefresh()}
          />
        </ActionPanel>
      }
    />
  );
}
