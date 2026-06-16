import { Clipboard, Icon, MenuBarExtra, open } from "@raycast/api";
import { PullRequest } from "../github/types";
import { DISABLE_AUTO_MERGE } from "../github/queries";
import { runMutation } from "../github/runMutation";
import { approvePullRequest } from "../github/approvePullRequest";
import { confirmAndMerge } from "../github/mergePullRequest";
import { enableAutoMerge } from "../github/enableAutoMerge";
import { shortRepoName } from "../lib/groupByRepo";
import { menuBarStatusLine } from "../lib/menuBarStatus";
import {
  MenuBarSection,
  menuBarPrimaryAction,
} from "../lib/menuBarPrimaryAction";
import { pullRequestStatus } from "./accessories";

/** Max length of the PR title shown on the (single-line) menu row. */
const MAX_TITLE = 36;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

interface Props {
  pr: PullRequest;
  section: MenuBarSection;
  viewerLogin: string | undefined;
  onRefresh: () => void;
  /** Called after an action that removes the PR from its list (approve/merge). */
  onResolved: (id: string) => void;
}

export function PullRequestMenuItem({
  pr,
  section,
  viewerLogin,
  onRefresh,
  onResolved,
}: Props) {
  const action = menuBarPrimaryAction(pr, section, viewerLogin);
  const status = pullRequestStatus(pr);
  const statusLine = menuBarStatusLine(pr);
  const title = `${shortRepoName(pr.repo)} #${pr.number} · ${truncate(pr.title, MAX_TITLE)}`;

  // Optimistically drop the row on success, then revalidate to reconcile.
  const resolveAndRefresh = () => {
    onResolved(pr.id);
    onRefresh();
  };

  return (
    <MenuBarExtra.Submenu title={title} icon={status.icon}>
      <MenuBarExtra.Section title={statusLine || undefined}>
        {action === "approve" && (
          <MenuBarExtra.Item
            title="Approve"
            icon={Icon.CheckCircle}
            onAction={() => approvePullRequest(pr, resolveAndRefresh)}
          />
        )}
        {action === "merge" && (
          <MenuBarExtra.Item
            title="Merge"
            icon={Icon.ArrowDownCircle}
            onAction={() => confirmAndMerge(pr, resolveAndRefresh)}
          />
        )}
        {action === "enable-auto-merge" && (
          <MenuBarExtra.Item
            title="Enable Auto-Merge"
            icon={Icon.Bolt}
            onAction={() => enableAutoMerge(pr, onRefresh)}
          />
        )}
        {action === "open" && (
          <MenuBarExtra.Item
            title="Open in Browser"
            icon={Icon.Globe}
            onAction={() => open(pr.url)}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {action !== "open" && (
          <MenuBarExtra.Item
            title="Open in Browser"
            icon={Icon.Globe}
            onAction={() => open(pr.url)}
          />
        )}
        <MenuBarExtra.Item
          title="Copy URL"
          icon={Icon.Link}
          onAction={() => Clipboard.copy(pr.url)}
        />
        <MenuBarExtra.Item
          title="Copy Branch Name"
          icon={Icon.Clipboard}
          onAction={() => Clipboard.copy(pr.headRefName)}
        />
        {pr.autoMergeEnabled && (
          <MenuBarExtra.Item
            title="Disable Auto-Merge"
            icon={Icon.BoltDisabled}
            onAction={() =>
              runMutation(
                "Disabling auto-merge…",
                `Auto-merge disabled on ${pr.repo}#${pr.number}`,
                DISABLE_AUTO_MERGE,
                { prId: pr.id },
                onRefresh,
              )
            }
          />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra.Submenu>
  );
}
