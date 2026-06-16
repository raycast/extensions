# Menu Bar Pull Requests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a third Raycast command — a macOS menu-bar entry that polls GitHub for the PRs you must review and your own PRs, shows them in a passive dropdown with a badge, and lets you approve / merge / enable auto-merge from the menu.

**Architecture:** A new `menu-bar` mode command (`pull-requests-menu-bar`) reuses the existing GitHub layer (search queries, `useCachedPromise` hooks, mutations, `mapPullRequest`, `mergeReadiness`, `primaryMergeAction`). All display decisions (badge count, per-PR status line, per-PR primary action) are extracted into **pure, unit-tested functions**. The two GitHub action bodies (`approve`, `confirm-then-merge`) are extracted into shared helpers so both the existing `Action` components and the new menu-bar items call the same code (DRY). Each PR is rendered as a `MenuBarExtra.Submenu` (interaction "variant C — hybrid"): a non-interactive section header shows the PR status, the smart primary action sits first, and secondary actions follow.

**Tech Stack:** TypeScript, React, `@raycast/api` (`MenuBarExtra`), `@raycast/utils` (`useCachedPromise`, `withAccessToken`), Vitest. Verification is headless: `npm test` (Vitest), `npx tsc --noEmit`, `npx eslint src tests`. The Raycast CLI (`ray`) is **not** available in this environment — `ray build`/`ray develop` (which regenerate `raycast-env.d.ts` and let you visually test the menu bar) are run by the user on their machine.

---

## Design decisions (locked during brainstorming)

- **Notifications:** passive only — a menu-bar badge + dropdown list. No native push notifications, so no diffing between polls.
- **Badge:** the count of PRs awaiting your review. `0` → icon only (no number). Tooltip adds context: `"N to review · M of mine ready to merge"`.
- **Menu content:** two flat sections — `To Review` and `Mine` — **not** sub-grouped by repository.
- **Per-PR interaction:** variant C (hybrid) — each PR is a submenu; the context-aware smart action is first and the status line is a section header.
  - **Update (post-implementation):** kept variant C (submenu) with all per-PR actions. macOS menu-bar items are single-line, so a two-line "title + subtitle" row is not possible (and `subtitle` exists only on leaf `MenuBarExtra.Item`, where it renders inline, not as a second line — and a leaf item can't hold the action submenu). To keep rows compact, the collapsed submenu title is `repo #n · title` with the PR title truncated to `MAX_TITLE` chars; the status line lives in the submenu's section header.
- **Confirmation:** Approve and a clean Merge run directly; Merge asks for confirmation **only** when `mergeReadiness` is `UNSTABLE` (mirrors the existing `SmartMergeAction`). Reused via the shared `confirmAndMerge` helper.
- **Refresh:** background `interval: "1m"` in the manifest. Configurability comes for free from Raycast's built-in per-command "Refresh every…" setting — **no custom preference is added** (the manifest `interval` can't be overridden at runtime anyway, so a custom preference would be misleading).
- **Auth:** `withAccessToken(github)`, identical to the existing commands.

## Conventions for every task

- Follow @superpowers:test-driven-development for the pure-function tasks (1–3): red → green → refactor.
- Tests live in `tests/` (not co-located) and import from `../src/...`, matching the existing suite. Use the `pr(overrides)` factory pattern from `tests/primaryMergeAction.test.ts`.
- Commit after every task. Conventional Commits style (`feat:`, `refactor:`, `docs:`).
- A baseline is green right now: **39 tests pass, `tsc` clean, `eslint` clean.** Keep it that way after every task.

---

## Task 1: `menuBarTitle` — badge number + tooltip (pure)

**Files:**
- Create: `src/lib/menuBarTitle.ts`
- Test: `tests/menuBarTitle.test.ts`

**Step 1: Write the failing test**

```ts
// tests/menuBarTitle.test.ts
import { describe, expect, it } from "vitest";
import { menuBarTitle } from "../src/lib/menuBarTitle";
import { PullRequest } from "../src/github/types";
import { MergeStateStatus } from "../src/lib/mergeReadiness";

const pr = (overrides: Partial<PullRequest> = {}): PullRequest =>
  ({
    state: "OPEN",
    isDraft: false,
    mergeStateStatus: "CLEAN" as MergeStateStatus,
    autoMergeEnabled: false,
    ...overrides,
  }) as PullRequest;

describe("menuBarTitle", () => {
  it("shows no badge number when nothing is awaiting review", () => {
    const result = menuBarTitle([], []);
    expect(result.title).toBeUndefined();
    expect(result.tooltip).toBe("0 to review · 0 of mine ready to merge");
  });

  it("counts review requests in the badge and ready-to-merge PRs in the tooltip", () => {
    const result = menuBarTitle(
      [pr(), pr()], // 2 to review
      [pr({ mergeStateStatus: "CLEAN" }), pr({ mergeStateStatus: "BLOCKED" })], // 1 ready
    );
    expect(result.title).toBe("2");
    expect(result.tooltip).toBe("2 to review · 1 of mine ready to merge");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/menuBarTitle.test.ts`
Expected: FAIL — "Cannot find module '../src/lib/menuBarTitle'".

**Step 3: Write minimal implementation**

```ts
// src/lib/menuBarTitle.ts
import { PullRequest } from "../github/types";
import { primaryMergeAction } from "./primaryMergeAction";

export interface MenuBarTitle {
  /** Badge text next to the icon; omitted (icon only) when there is nothing to review. */
  title?: string;
  tooltip: string;
}

/**
 * Badge + tooltip for the menu-bar icon. The badge counts PRs awaiting your
 * review; the tooltip adds how many of your own PRs are mergeable right now.
 */
export function menuBarTitle(
  toReview: PullRequest[],
  mine: PullRequest[],
): MenuBarTitle {
  const reviewCount = toReview.length;
  const readyCount = mine.filter(
    (pr) => primaryMergeAction(pr) === "merge",
  ).length;
  return {
    title: reviewCount > 0 ? String(reviewCount) : undefined,
    tooltip: `${reviewCount} to review · ${readyCount} of mine ready to merge`,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/menuBarTitle.test.ts`
Expected: PASS (2 tests).

**Step 5: Commit**

```bash
git add src/lib/menuBarTitle.ts tests/menuBarTitle.test.ts
git commit -m "feat: add menu-bar badge title helper"
```

---

## Task 2: `menuBarStatusLine` — folded status string (pure)

The menu-bar item cannot show the multi-accessory row of the `view` commands, so checks/approval/draft are folded into one short string used as the submenu's section header.

**Files:**
- Create: `src/lib/menuBarStatus.ts`
- Test: `tests/menuBarStatus.test.ts`

**Step 1: Write the failing test**

```ts
// tests/menuBarStatus.test.ts
import { describe, expect, it } from "vitest";
import { menuBarStatusLine } from "../src/lib/menuBarStatus";
import { PullRequest } from "../src/github/types";

const pr = (overrides: Partial<PullRequest> = {}): PullRequest =>
  ({
    state: "OPEN",
    isDraft: false,
    checksState: null,
    reviewDecision: null,
    ...overrides,
  }) as PullRequest;

describe("menuBarStatusLine", () => {
  it("combines passing checks and approval", () => {
    expect(
      menuBarStatusLine(pr({ checksState: "SUCCESS", reviewDecision: "APPROVED" })),
    ).toBe("checks ✓ · approved");
  });

  it("shows an hourglass for pending checks", () => {
    expect(menuBarStatusLine(pr({ checksState: "PENDING" }))).toBe("checks ⏳");
  });

  it("shows a cross for failing or errored checks and changes requested", () => {
    expect(
      menuBarStatusLine(pr({ checksState: "FAILURE", reviewDecision: "CHANGES_REQUESTED" })),
    ).toBe("checks ✗ · changes requested");
    expect(menuBarStatusLine(pr({ checksState: "ERROR" }))).toBe("checks ✗");
  });

  it("labels drafts", () => {
    expect(menuBarStatusLine(pr({ isDraft: true }))).toBe("draft");
  });

  it("returns an empty string when there is nothing to show", () => {
    expect(menuBarStatusLine(pr())).toBe("");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/menuBarStatus.test.ts`
Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

```ts
// src/lib/menuBarStatus.ts
import { ChecksState, PullRequest } from "../github/types";

const CHECKS_GLYPH: Record<Exclude<ChecksState, null>, string> = {
  SUCCESS: "✓",
  FAILURE: "✗",
  ERROR: "✗",
  PENDING: "⏳",
  EXPECTED: "⏳",
};

/** PR status folded into one short line (used as a submenu section header). */
export function menuBarStatusLine(pr: PullRequest): string {
  const parts: string[] = [];
  if (pr.isDraft) parts.push("draft");
  if (pr.checksState) parts.push(`checks ${CHECKS_GLYPH[pr.checksState]}`);
  if (pr.reviewDecision === "APPROVED") parts.push("approved");
  else if (pr.reviewDecision === "CHANGES_REQUESTED") parts.push("changes requested");
  return parts.join(" · ");
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/menuBarStatus.test.ts`
Expected: PASS (5 tests).

**Step 5: Commit**

```bash
git add src/lib/menuBarStatus.ts tests/menuBarStatus.test.ts
git commit -m "feat: add menu-bar status line helper"
```

---

## Task 3: `menuBarPrimaryAction` — context-aware primary action (pure)

Decides the highlighted action per PR: in the `To Review` section it's `approve` (when allowed); in the `Mine` section it follows `primaryMergeAction`. Everything else falls back to `open`.

**Files:**
- Create: `src/lib/menuBarPrimaryAction.ts`
- Test: `tests/menuBarPrimaryAction.test.ts`

**Step 1: Write the failing test**

```ts
// tests/menuBarPrimaryAction.test.ts
import { describe, expect, it } from "vitest";
import { menuBarPrimaryAction } from "../src/lib/menuBarPrimaryAction";
import { PullRequest } from "../src/github/types";
import { MergeStateStatus } from "../src/lib/mergeReadiness";

const pr = (overrides: Partial<PullRequest> = {}): PullRequest =>
  ({
    state: "OPEN",
    isDraft: false,
    authorLogin: "someone",
    viewerHasApproved: false,
    mergeStateStatus: "CLEAN" as MergeStateStatus,
    autoMergeEnabled: false,
    ...overrides,
  }) as PullRequest;

describe("menuBarPrimaryAction", () => {
  it("approves an approvable PR in the review section", () => {
    expect(menuBarPrimaryAction(pr(), "review", "octocat")).toBe("approve");
  });

  it("falls back to open when the PR can't be approved", () => {
    expect(menuBarPrimaryAction(pr({ authorLogin: "octocat" }), "review", "octocat")).toBe("open");
  });

  it("merges a ready PR in the mine section", () => {
    expect(menuBarPrimaryAction(pr({ mergeStateStatus: "CLEAN" }), "mine", "octocat")).toBe("merge");
  });

  it("enables auto-merge when a mine PR isn't ready yet", () => {
    expect(menuBarPrimaryAction(pr({ mergeStateStatus: "BLOCKED" }), "mine", "octocat")).toBe("enable-auto-merge");
  });

  it("falls back to open on conflicts and drafts", () => {
    expect(menuBarPrimaryAction(pr({ mergeStateStatus: "DIRTY" }), "mine", "octocat")).toBe("open");
    expect(menuBarPrimaryAction(pr({ isDraft: true }), "mine", "octocat")).toBe("open");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/menuBarPrimaryAction.test.ts`
Expected: FAIL — module not found.

**Step 3: Write minimal implementation**

```ts
// src/lib/menuBarPrimaryAction.ts
import { PullRequest } from "../github/types";
import { canApprove } from "./canApprove";
import { primaryMergeAction } from "./primaryMergeAction";

export type MenuBarAction = "approve" | "merge" | "enable-auto-merge" | "open";

export type MenuBarSection = "review" | "mine";

/** The highlighted action for a PR row, by section and approvability. */
export function menuBarPrimaryAction(
  pr: PullRequest,
  section: MenuBarSection,
  viewerLogin: string | undefined,
): MenuBarAction {
  if (section === "review") {
    return canApprove(pr, viewerLogin) ? "approve" : "open";
  }
  const merge = primaryMergeAction(pr);
  if (merge === "merge") return "merge";
  if (merge === "enable-auto-merge") return "enable-auto-merge";
  return "open";
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/menuBarPrimaryAction.test.ts`
Expected: PASS (5 tests).

**Step 5: Commit**

```bash
git add src/lib/menuBarPrimaryAction.ts tests/menuBarPrimaryAction.test.ts
git commit -m "feat: add menu-bar primary action helper"
```

---

## Task 4: Extract `confirmAndMerge` helper and reuse it in `SmartMergeAction`

The menu-bar item needs the "confirm-when-UNSTABLE then merge" behavior as a plain function. Extract it from `SmartMergeAction` so both call the same code. No new unit test (it calls `confirmAlert`/`runMutation`, which need the Raycast runtime); correctness is preserved by keeping `SmartMergeAction`'s existing behavior and the green `tsc`/`eslint`/test suite.

**Files:**
- Create: `src/github/mergePullRequest.ts`
- Modify: `src/components/SmartMergeAction.tsx` (replace the inline `onAction` body)

**Step 1: Create the helper**

```ts
// src/github/mergePullRequest.ts
import { Alert, confirmAlert } from "@raycast/api";
import { MERGE_PULL_REQUEST } from "./queries";
import { PullRequest } from "./types";
import { runMutation } from "./runMutation";
import { mergeReadiness } from "../lib/mergeReadiness";

/**
 * Merge a PR with the repo's default method. When the merge is "risky"
 * (UNSTABLE — non-required checks failing) it asks for confirmation first.
 */
export async function confirmAndMerge(pr: PullRequest, onRefresh: () => void) {
  const readiness = mergeReadiness(pr.mergeStateStatus);
  if (readiness.kind === "confirm") {
    const confirmed = await confirmAlert({
      title: "Merge anyway?",
      message: readiness.reason,
      primaryAction: { title: "Merge", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
  }
  await runMutation(
    "Merging…",
    `Merged ${pr.repo}#${pr.number}`,
    MERGE_PULL_REQUEST,
    { prId: pr.id, method: pr.defaultMergeMethod },
    onRefresh,
  );
}
```

**Step 2: Rewrite `SmartMergeAction` to use it**

Replace the entire file contents:

```tsx
// src/components/SmartMergeAction.tsx
import { Action, Icon } from "@raycast/api";
import { PullRequest } from "../github/types";
import { enableAutoMerge } from "../github/enableAutoMerge";
import { confirmAndMerge } from "../github/mergePullRequest";
import { primaryMergeAction } from "../lib/primaryMergeAction";

interface Props {
  pr: PullRequest;
  onRefresh: () => void;
}

export function SmartMergeAction({ pr, onRefresh }: Props) {
  const action = primaryMergeAction(pr);

  if (action === "merge") {
    return (
      <Action
        title="Merge"
        icon={Icon.ArrowDownCircle}
        onAction={() => confirmAndMerge(pr, onRefresh)}
      />
    );
  }

  if (action === "enable-auto-merge") {
    return (
      <Action
        title="Enable Auto-Merge"
        icon={Icon.Bolt}
        onAction={() => enableAutoMerge(pr, onRefresh)}
      />
    );
  }

  return null;
}
```

**Step 3: Verify (type-check, lint, full test suite)**

Run: `npx tsc --noEmit && npx eslint src tests && npm test`
Expected: tsc exit 0, eslint exit 0, all tests pass (still 49 after Tasks 1–3). No unused-import errors in `SmartMergeAction`.

**Step 4: Commit**

```bash
git add src/github/mergePullRequest.ts src/components/SmartMergeAction.tsx
git commit -m "refactor: extract confirmAndMerge helper for reuse"
```

---

## Task 5: Extract `approvePullRequest` helper and reuse it in `ApproveAction`

Same idea for Approve, so the menu-bar item and `ApproveAction` share one implementation.

**Files:**
- Create: `src/github/approvePullRequest.ts`
- Modify: `src/components/ApproveAction.tsx`

**Step 1: Create the helper**

```ts
// src/github/approvePullRequest.ts
import { showToast, Toast } from "@raycast/api";
import { githubGraphql } from "./client";
import { APPROVE_PULL_REQUEST } from "./queries";
import { PullRequest } from "./types";

/** Submit an APPROVE review for a PR, with progress/success/failure toasts. */
export async function approvePullRequest(pr: PullRequest, onRefresh: () => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Approving…",
  });
  try {
    await githubGraphql(APPROVE_PULL_REQUEST, { prId: pr.id });
    toast.style = Toast.Style.Success;
    toast.title = `Approved ${pr.repo}#${pr.number}`;
    onRefresh();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Approve failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
```

**Step 2: Rewrite `ApproveAction` to use it**

```tsx
// src/components/ApproveAction.tsx
import { Action, Icon } from "@raycast/api";
import { PullRequest } from "../github/types";
import { canApprove } from "../lib/canApprove";
import { approvePullRequest } from "../github/approvePullRequest";

interface Props {
  pr: PullRequest;
  viewerLogin: string | undefined;
  onRefresh: () => void;
}

export function ApproveAction({ pr, viewerLogin, onRefresh }: Props) {
  if (!canApprove(pr, viewerLogin)) {
    return null;
  }

  return (
    <Action
      title="Approve"
      icon={Icon.CheckCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={() => approvePullRequest(pr, onRefresh)}
    />
  );
}
```

**Step 3: Verify**

Run: `npx tsc --noEmit && npx eslint src tests && npm test`
Expected: all green; `ApproveAllAction` (which calls `githubGraphql` directly) is untouched and still compiles.

**Step 4: Commit**

```bash
git add src/github/approvePullRequest.ts src/components/ApproveAction.tsx
git commit -m "refactor: extract approvePullRequest helper for reuse"
```

---

## Task 6: `PullRequestMenuItem` — one PR as a submenu (variant C)

**Files:**
- Create: `src/components/PullRequestMenuItem.tsx`

**Step 1: Write the component**

```tsx
// src/components/PullRequestMenuItem.tsx
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

interface Props {
  pr: PullRequest;
  section: MenuBarSection;
  viewerLogin: string | undefined;
  onRefresh: () => void;
}

export function PullRequestMenuItem({
  pr,
  section,
  viewerLogin,
  onRefresh,
}: Props) {
  const action = menuBarPrimaryAction(pr, section, viewerLogin);
  const status = pullRequestStatus(pr);
  const statusLine = menuBarStatusLine(pr);
  const title = `${shortRepoName(pr.repo)} #${pr.number} · ${pr.title}`;

  return (
    <MenuBarExtra.Submenu title={title} icon={status.icon}>
      <MenuBarExtra.Section title={statusLine || undefined}>
        {action === "approve" && (
          <MenuBarExtra.Item
            title="Approve"
            icon={Icon.CheckCircle}
            onAction={() => approvePullRequest(pr, onRefresh)}
          />
        )}
        {action === "merge" && (
          <MenuBarExtra.Item
            title="Merge"
            icon={Icon.ArrowDownCircle}
            onAction={() => confirmAndMerge(pr, onRefresh)}
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
```

**Step 2: Verify (type-check + lint)**

Run: `npx tsc --noEmit && npx eslint src tests`
Expected: exit 0 both. (No unit test — it's a Raycast component; behavior is verified manually with `ray develop` in Task 8's notes.)

**Step 3: Commit**

```bash
git add src/components/PullRequestMenuItem.tsx
git commit -m "feat: add PullRequestMenuItem submenu for the menu bar"
```

---

## Task 7: `pull-requests-menu-bar` — the command entry point

**Files:**
- Create: `src/pull-requests-menu-bar.tsx`

**Step 1: Write the component**

```tsx
// src/pull-requests-menu-bar.tsx
import { Icon, LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { github } from "./github/auth";
import {
  usePullRequestSearch,
  useReviewRequests,
} from "./github/usePullRequests";
import {
  closedUnreviewedQuery,
  myOpenPullRequestsQuery,
  pendingReviewQuery,
} from "./lib/searchQueries";
import { getSearchScope } from "./preferences";
import { menuBarTitle } from "./lib/menuBarTitle";
import { PullRequestMenuItem } from "./components/PullRequestMenuItem";

function PullRequestsMenuBar() {
  const scope = getSearchScope();
  const review = useReviewRequests(
    pendingReviewQuery(scope),
    closedUnreviewedQuery(new Date(), scope),
  );
  const mine = usePullRequestSearch(myOpenPullRequestsQuery(scope));

  const toReview = review.data?.pending ?? [];
  const myPrs = mine.data?.pullRequests ?? [];
  const viewerLogin = review.data?.viewerLogin ?? mine.data?.viewerLogin;
  const isLoading = review.isLoading || mine.isLoading;
  const hasError = Boolean(review.error || mine.error);
  const { title, tooltip } = menuBarTitle(toReview, myPrs);

  function onRefresh() {
    review.revalidate();
    mine.revalidate();
  }

  return (
    <MenuBarExtra
      icon={{ source: "pull-request-open.svg" }}
      title={title}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      {hasError && (
        <MenuBarExtra.Item
          title="Couldn't refresh — showing cached data"
          icon={Icon.Warning}
          onAction={onRefresh}
        />
      )}

      {toReview.length > 0 && (
        <MenuBarExtra.Section title={`To Review (${toReview.length})`}>
          {toReview.map((pr) => (
            <PullRequestMenuItem
              key={pr.id}
              pr={pr}
              section="review"
              viewerLogin={viewerLogin}
              onRefresh={onRefresh}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {myPrs.length > 0 && (
        <MenuBarExtra.Section title={`Mine (${myPrs.length})`}>
          {myPrs.map((pr) => (
            <PullRequestMenuItem
              key={pr.id}
              pr={pr}
              section="mine"
              viewerLogin={viewerLogin}
              onRefresh={onRefresh}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {!isLoading && !hasError && toReview.length === 0 && myPrs.length === 0 && (
        <MenuBarExtra.Item title="No pull requests" icon={Icon.Check} />
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.ArrowClockwise}
          onAction={onRefresh}
        />
        <MenuBarExtra.Item
          title="Open My Pull Requests…"
          icon={Icon.List}
          onAction={() => {
            launchCommand({
              name: "my-pull-requests",
              type: LaunchType.UserInitiated,
            }).catch(() => undefined);
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default withAccessToken(github)(PullRequestsMenuBar);
```

**Step 2: Verify (type-check + lint)**

Run: `npx tsc --noEmit && npx eslint src tests`
Expected: exit 0 both. If `eslint` flags the floating promise on `launchCommand`, the `.catch(() => undefined)` already guards it; keep it.

**Step 3: Commit**

```bash
git add src/pull-requests-menu-bar.tsx
git commit -m "feat: add pull-requests menu-bar command entry"
```

---

## Task 8: Register the command in the manifest

**Files:**
- Modify: `package.json` (`commands` array)

**Step 1: Add the command after the existing two**

In `package.json`, the `commands` array currently ends with the `review-requests` entry. Add a third entry (mind the comma after the `review-requests` object):

```json
    {
      "name": "pull-requests-menu-bar",
      "title": "Pull Requests Menu Bar",
      "description": "Your PRs and review requests in the menu bar; approve and merge from there.",
      "mode": "menu-bar",
      "interval": "1m"
    }
```

**Step 2: Verify JSON + types + lint**

Run: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')" && npx tsc --noEmit && npx eslint src tests && npm test`
Expected: "package.json OK", tsc exit 0, eslint exit 0, all tests pass.

> Note: `raycast-env.d.ts` is auto-generated by the Raycast CLI and is **not** required for the checks above to pass (the new command's code only uses the extension-wide `Preferences` type, which already exists). Do **not** hand-edit it. When you next run `ray develop`/`ray build` on your machine it regenerates automatically.

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat: register pull-requests-menu-bar command"
```

**Step 4: Manual verification (user, outside this environment)**

On your machine (where `ray` is installed):

```bash
npm run dev   # ray develop
```

Then confirm in the menu bar:
- Icon appears with a badge equal to your "to review" count (no number when 0).
- `To Review` and `Mine` sections list PRs; each opens a submenu with the status header, the correct primary action first, and Open/Copy below.
- Approve runs directly; a clean Merge runs directly; an `UNSTABLE` Merge asks to confirm.
- "Refresh Now" updates the list; "Open My Pull Requests…" launches the view command.
- Raycast's command settings expose a "Refresh every…" control (defaulting to 1 minute) — that's the configurable interval.

---

## Task 9: Documentation

**Files:**
- Modify: `README.md` (Commands section)
- Modify: `CHANGELOG.md` (new top entry)

**Step 1: Add the command to `README.md`**

Under `## Commands`, after the **Review Requests** bullet, add:

```markdown
- **Pull Requests Menu Bar** — a macOS menu-bar entry that polls GitHub in the background and shows, in one dropdown, the PRs **awaiting your review** and **your own** open PRs. The icon shows a badge with the number of PRs awaiting your review. Each PR opens a submenu where you can **Approve**, **Merge** / **Enable Auto-Merge** (the smart action is highlighted first), open it, or copy its URL/branch. Refresh interval is configurable from Raycast's command settings (default: every minute).
```

**Step 2: Add a `CHANGELOG.md` entry**

Insert a new entry directly under the title line, above `## [Initial Version]`, following the existing `{PR_MERGE_DATE}` convention:

```markdown
## [Menu Bar] - {PR_MERGE_DATE}

- Added a **Pull Requests Menu Bar** command: a passive menu-bar list of PRs awaiting your review and your own open PRs, with a badge counting review requests.
- Approve, merge, or enable auto-merge directly from the menu (merge asks for confirmation only when non-required checks are failing).
- Background refresh every minute, configurable from the command settings.
```

**Step 3: Verify (full suite stays green)**

Run: `npx tsc --noEmit && npx eslint src tests && npm test`
Expected: all green (docs don't affect these, but confirm nothing regressed).

**Step 4: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: document the pull-requests menu-bar command"
```

---

## Done

After Task 9: the feature is implemented, headless-verified (`tsc`/`eslint`/Vitest green, ~49 tests), and documented. Remaining human step is the visual/manual check via `ray develop` (Task 8, Step 4) and publishing.
