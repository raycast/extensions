import type { ActivityItem, GHReviewComment, PRWithActivity, SeenState } from "./types";

// ─── Build all activity items for a PR (used for seen-tracking) ─────────────

export function getAllActivity(pr: PRWithActivity): ActivityItem[] {
  const items: ActivityItem[] = [];

  // PR opened event
  items.push({
    type: "pr_opened",
    id: `pr-opened-${pr.number}`,
    itemKey: `pr-opened-${pr.number}`,
    user: pr.user,
    body: pr.title,
    date: pr.created_at,
    htmlUrl: pr.html_url,
  });

  for (const r of pr.reviews) {
    // Filter out empty COMMENTED reviews — these are ghosts wrapping inline comments
    if (r.state === "COMMENTED" && (!r.body || r.body.trim() === "")) continue;
    items.push({
      type: "review",
      id: r.id,
      itemKey: `review-${r.id}`,
      user: r.user,
      body: r.body,
      date: r.submitted_at,
      htmlUrl: r.html_url,
      reviewState: r.state,
    });
  }

  for (const c of pr.reviewComments) {
    items.push({
      type: "review_comment",
      id: c.id,
      itemKey: `rc-${c.id}`,
      user: c.user,
      body: c.body,
      date: c.created_at,
      htmlUrl: c.html_url,
      path: c.path,
      line: c.line ?? c.original_line,
      diffHunk: c.diff_hunk,
      inReplyToId: c.in_reply_to_id,
    });
  }

  for (const c of pr.issueComments) {
    items.push({
      type: "issue_comment",
      id: c.id,
      itemKey: `ic-${c.id}`,
      user: c.user,
      body: c.body,
      date: c.created_at,
      htmlUrl: c.html_url,
    });
  }

  // Label events
  for (const e of pr.events) {
    if (e.event === "labeled" && e.label) {
      items.push({
        type: "label_added",
        id: e.id,
        itemKey: `label-added-${e.id}`,
        user: e.actor,
        body: e.label.name,
        date: e.created_at,
        htmlUrl: pr.html_url,
        labelName: e.label.name,
        labelColor: e.label.color,
      });
    } else if (e.event === "unlabeled" && e.label) {
      items.push({
        type: "label_removed",
        id: e.id,
        itemKey: `label-removed-${e.id}`,
        user: e.actor,
        body: e.label.name,
        date: e.created_at,
        htmlUrl: pr.html_url,
        labelName: e.label.name,
        labelColor: e.label.color,
      });
    } else if (e.event === "head_ref_force_pushed") {
      items.push({
        type: "force_push",
        id: e.id,
        itemKey: `force-push-${e.id}`,
        user: e.actor,
        body: "Force pushed to this branch",
        date: e.created_at,
        htmlUrl: pr.html_url,
      });
    }
  }

  // Commits
  for (const c of pr.commits) {
    const firstLine = c.commit.message.split("\n")[0];
    items.push({
      type: "push",
      id: c.sha,
      itemKey: `commit-${c.sha}`,
      user: c.author ?? { login: c.commit.author.name, avatar_url: "" },
      body: firstLine,
      date: c.commit.author.date,
      htmlUrl: c.html_url,
      commitSha: c.sha,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}

// ─── Gather unseen activity items ───────────────────────────────────────────

export function getUnseenActivity(pr: PRWithActivity, seen: SeenState | undefined): ActivityItem[] {
  const allItems = getAllActivity(pr);
  if (!seen) return allItems; // never seen = everything is new

  const seenSet = new Set(seen.seenItemIds ?? []);
  return allItems.filter((item) => !seenSet.has(item.itemKey));
}

// ─── Build the conversation thread for a review comment ─────────────────────

export function buildThread(comment: ActivityItem, allReviewComments: GHReviewComment[]): GHReviewComment[] {
  if (comment.type !== "review_comment") return [];

  const byId = new Map<number, GHReviewComment>();
  for (const c of allReviewComments) byId.set(c.id, c);

  // Find the root of the thread
  let rootId = comment.id as number;
  const visited = new Set<number>();
  while (true) {
    const current = byId.get(rootId);
    if (!current || !current.in_reply_to_id || visited.has(current.in_reply_to_id)) break;
    visited.add(rootId);
    rootId = current.in_reply_to_id;
  }

  // Collect all comments in this thread
  const threadIds = new Set<number>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of allReviewComments) {
      if (threadIds.has(c.id)) continue;
      if (c.in_reply_to_id && threadIds.has(c.in_reply_to_id)) {
        threadIds.add(c.id);
        changed = true;
      }
    }
  }

  return allReviewComments
    .filter((c) => threadIds.has(c.id))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

// ─── Markdown rendering ─────────────────────────────────────────────────────

const REVIEW_STATE_EMOJI: Record<string, string> = {
  APPROVED: "✅",
  CHANGES_REQUESTED: "❌",
  COMMENTED: "💬",
  DISMISSED: "➖",
  PENDING: "⏳",
};

const REVIEW_STATE_LABEL: Record<string, string> = {
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes Requested",
  COMMENTED: "Commented",
  DISMISSED: "Dismissed",
  PENDING: "Pending",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "unknown";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Render a single activity item as markdown */
export function renderActivityMarkdown(item: ActivityItem, allReviewComments: GHReviewComment[]): string {
  const lines: string[] = [];

  if (item.type === "review") {
    const emoji = REVIEW_STATE_EMOJI[item.reviewState ?? ""] ?? "📝";
    const label = REVIEW_STATE_LABEL[item.reviewState ?? ""] ?? item.reviewState;
    lines.push(`## ${emoji} Review: ${label}`);
    lines.push(`**${item.user.login}** · ${formatDate(item.date)}`);
    lines.push("");
    if (item.body) {
      lines.push(item.body);
    } else {
      lines.push("*No comment body*");
    }
  }

  if (item.type === "review_comment") {
    lines.push(`## 💬 Code Comment`);
    lines.push(`📄 \`${item.path}\`${item.line ? ` · line ${item.line}` : ""}`);
    lines.push("");

    if (item.diffHunk) {
      lines.push("```diff");
      lines.push(item.diffHunk);
      lines.push("```");
      lines.push("");
    }

    const thread = buildThread(item, allReviewComments);
    if (thread.length > 0) {
      lines.push("---");
      lines.push("### Conversation");
      lines.push("");
      for (let i = 0; i < thread.length; i++) {
        const msg = thread[i];
        const isCurrentItem = msg.id === item.id;
        const isLast = i === thread.length - 1;
        const connector = isCurrentItem ? "●─" : isLast ? "╰─" : "├─";
        const rail = isLast ? "  " : "│ ";

        lines.push(`${connector} **${msg.user.login}** · ${formatDate(msg.created_at)}`);
        lines.push("");
        // Indent body lines under the rail
        for (const bodyLine of msg.body.split("\n")) {
          lines.push(`${rail} ${bodyLine}`);
        }
        lines.push("");
      }
    } else {
      lines.push(`**${item.user.login}** · ${formatDate(item.date)}`);
      lines.push("");
      lines.push(item.body);
    }
  }

  if (item.type === "issue_comment") {
    lines.push(`## 🗨️ Comment`);
    lines.push(`**${item.user.login}** · ${formatDate(item.date)}`);
    lines.push("");
    lines.push(item.body);
  }

  if (item.type === "label_added") {
    lines.push(`## 🏷️ Label Added`);
    lines.push(`**${item.user.login}** added label **${item.labelName}** · ${formatDate(item.date)}`);
  }

  if (item.type === "label_removed") {
    lines.push(`## 🏷️ Label Removed`);
    lines.push(`**${item.user.login}** removed label **${item.labelName}** · ${formatDate(item.date)}`);
  }

  if (item.type === "push") {
    lines.push(`## 🔨 New Commit`);
    lines.push(`**${item.user.login}** · ${formatDate(item.date)}`);
    lines.push("");
    lines.push(`\`${item.commitSha?.slice(0, 7)}\` ${item.body}`);
  }

  if (item.type === "pr_opened") {
    lines.push(`## 🆕 Pull Request Opened`);
    lines.push(`**${item.user.login}** opened this PR · ${formatDate(item.date)}`);
    lines.push("");
    lines.push(item.body);
  }

  if (item.type === "force_push") {
    lines.push(`## ⚠️ Force Push`);
    lines.push(`**${item.user.login}** force pushed to this branch · ${formatDate(item.date)}`);
  }

  return lines.join("\n");
}

/** Render a PR-level summary of all unseen items */
export function renderPRSummaryMarkdown(pr: PRWithActivity, unseenItems: ActivityItem[]): string {
  const lines: string[] = [];

  lines.push(`# #${pr.number} — ${pr.title}`);
  lines.push(`by **${pr.user.login}** · ${unseenItems.length} unseen update${unseenItems.length !== 1 ? "s" : ""}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const item of unseenItems) {
    let emoji: string;
    let label: string;

    switch (item.type) {
      case "review":
        emoji = REVIEW_STATE_EMOJI[item.reviewState ?? ""] ?? "📝";
        label = REVIEW_STATE_LABEL[item.reviewState ?? ""] ?? item.reviewState ?? "";
        break;
      case "review_comment":
        emoji = item.inReplyToId ? "↩️" : "💬";
        label = item.inReplyToId ? `Replied on \`${item.path}\`` : `Code comment on \`${item.path}\``;
        break;
      case "label_added":
        emoji = "🏷️";
        label = `Added label **${item.labelName}**`;
        break;
      case "label_removed":
        emoji = "🏷️";
        label = `Removed label **${item.labelName}**`;
        break;
      case "push":
        emoji = "🔨";
        label = `Commit \`${item.commitSha?.slice(0, 7)}\` — ${item.body}`;
        break;
      case "pr_opened":
        emoji = "🆕";
        label = "PR opened";
        break;
      case "force_push":
        emoji = "⚠️";
        label = "Force pushed";
        break;
      default:
        emoji = "🗨️";
        label = "Comment";
    }

    lines.push(`${emoji} **${item.user.login}** — ${label} · ${formatDate(item.date)}`);
    lines.push("");
  }

  return lines.join("\n");
}
