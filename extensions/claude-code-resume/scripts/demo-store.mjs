// Generate a fake .claude store with fictional sessions for Store screenshots.
// Point the extension's "Claude Home (.claude)" preference at the target dir,
// take screenshots with Raycast's Window Capture, then clear the preference.
//
// Usage: node scripts/demo-store.mjs [target-dir]   (default: ~/demo-claude)
//
// Layout produced (what sessions.ts reads): projects/<encoded-cwd>/<uuid>.jsonl
// where the encoding replaces every path separator with "-". File mtimes are
// staggered so the session list orders naturally (newest first).
import { mkdirSync, writeFileSync, utimesSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import * as os from "node:os";
import * as path from "node:path";

const target = path.resolve(
  (process.argv[2] ?? path.join(os.homedir(), "demo-claude")).replace(
    /^~(?=\/|$)/,
    os.homedir(),
  ),
);

const user = (line) =>
  JSON.stringify({ type: "user", message: { role: "user", content: line } });
const assistant = (text) =>
  JSON.stringify({
    type: "assistant",
    message: { role: "assistant", content: [{ type: "text", text }] },
  });
const meta = (cwd) => JSON.stringify({ type: "summary", cwd });
const aiTitle = (t) => JSON.stringify({ type: "ai-title", aiTitle: t });

// Fictional projects and conversations. Everything in English — Store
// screenshots target the international audience. The list view shows the
// title, project and relative time; the detail pane shows the first prompt,
// the latest prompt and the last reply — so those carry the realism.
const HOME = "/Users/you";
const sessions = [
  {
    cwd: `${HOME}/work/checkout-service`,
    title: "Fix N+1 queries on GET /api/orders",
    hoursAgo: 0.4,
    turns: [
      ["u", "GET /api/orders is doing 200+ queries per request according to the APM trace. Pretty sure it's an N+1 on order items."],
      ["a", "Confirmed — `OrderSerializer` lazy-loads `items`, then `items.product` per row. I added `joinedload(Order.items).joinedload(OrderItem.product)` to the list query and a regression test that asserts the query count stays under 5. The trace shows 3 queries now."],
      ["u", "does that blow up memory on big orders?"],
      ["a", "No — the largest order in staging has 214 items, ~80KB hydrated. I also capped `page_size` at 100 so the worst case per request stays bounded. Full suite passes: 412 tests in 14s."],
    ],
  },
  {
    cwd: `${HOME}/dev/raycast-snippets`,
    title: "Bump @raycast/api to 1.104 and fix List props",
    hoursAgo: 1.7,
    turns: [
      ["u", "bump @raycast/api to the latest and fix whatever breaks"],
      ["a", "Upgraded 1.88.4 → 1.104.19. Two breakages: `List.Item.accessoryTitle` was removed (migrated to the `accessories` array) and `getSelectedText` now throws instead of returning undefined — wrapped it in a try/catch in `paste-snippet.tsx`. `ray build` and `ray lint` are both clean."],
      ["u", "nice, did the deprecation warnings in dev console go away too?"],
      ["a", "Yes — the console is clean now. The only remaining warning was our own `console.log` in dev mode, which I removed while I was there."],
    ],
  },
  {
    cwd: `${HOME}/work/checkout-service`,
    title: "Retry with backoff for Stripe webhook handler",
    hoursAgo: 4.2,
    turns: [
      ["u", "We dropped 3 Stripe webhooks during yesterday's deploy window. Can we make the handler retry instead of 500ing?"],
      ["a", "I'd keep the handler itself dumb and fast: persist the raw event first, ack with 200, and process from a queue with exponential backoff (3 retries: 1m/5m/25m), plus a dead-letter table for manual replay. Stripe also retries on their side for 72h, so this double layer covers deploys."],
      ["u", "ok go with that. add a replay command for the dead-letter table too"],
      ["a", "Done. `make replay-webhooks` replays dead-lettered events through the same worker path, idempotent via the Stripe event id unique index. Added tests for the duplicate-delivery case and updated the runbook in docs/oncall.md."],
    ],
  },
  {
    cwd: `${HOME}/work/web`,
    title: "Convert Header to a server component",
    hoursAgo: 8,
    turns: [
      ["u", "Header is still a client component and it pulls in 40KB of JS just to render the nav. Convert it to a server component, the only interactive bit is the user menu."],
      ["a", "Split it: `Header` is now a server component that renders nav + fetches the user on the server; the dropdown is extracted into `UserMenu` with `'use client'`. First-load JS for the marketing pages dropped 38KB → 6KB."],
      ["u", "lighthouse?"],
      ["a", "LCP on / went from 2.4s to 1.9s on throttled mobile, performance score 88 → 96. The remaining blocker is the hero image preload, which is a separate issue — filed as #381."],
    ],
  },
  {
    cwd: `${HOME}/dev/my-blog`,
    title: "Dark mode toggle without the flash",
    hoursAgo: 27,
    turns: [
      ["u", "Add a dark mode toggle to the blog. Respect the system preference by default, and I don't want the white flash on load."],
      ["a", "Done with a tiny inline script in <head> that sets `data-theme` from localStorage (falling back to `prefers-color-scheme`) before first paint — no flash. The toggle just flips the attribute and persists the choice."],
      ["u", "code blocks look washed out in dark mode still"],
      ["a", "Fixed — Shiki was shipping its own background. I generate both `github-light` and `github-dark` at build time and switch via CSS variables, and bumped inline-code contrast. Both themes pass WCAG AA now."],
    ],
  },
  {
    cwd: `${HOME}/oss/zod-forms`,
    title: "Repro and fix #142: nested array validation",
    hoursAgo: 30,
    turns: [
      ["u", "someone filed https://github.com/you/zod-forms/issues/142 — validation errors on nested arrays point at the wrong index. can you reproduce it first?"],
      ["a", "Reproduced. With `items[2].tags[0]` failing, the error path comes back as `items[0].tags[2]` — the path segments get reversed when we rebuild them from the zod issue. The bug is in `flattenIssuePath()`: it unshifts instead of pushing."],
      ["u", "classic. fix + changeset please, patch bump"],
      ["a", "Fixed with a regression test matrix over 3 nesting depths, added the changeset (patch), and replied on the issue with the repro and the fix commit. CI is green."],
    ],
  },
  {
    cwd: `${HOME}/work/infra`,
    title: "Move RDS snapshot schedule into the db module",
    hoursAgo: 76,
    turns: [
      ["u", "terraform plan keeps showing drift on the RDS snapshot schedule because someone set it by hand. pull it into our db module so it's actually managed"],
      ["a", "Added `snapshot_schedule` to the db module (default: daily 03:00 UTC, 14-day retention) and imported the hand-made schedule into state with `terraform import`, so the first apply is a no-op. Plan is clean across staging and prod workspaces."],
      ["u", "lgtm. open the PR with the plan output in the description"],
      ["a", "PR #88 is up with the staging and prod plan outputs collapsed in details blocks, and a note for reviewers that the import already happened so merge order doesn't matter."],
    ],
  },
  {
    cwd: `${HOME}/dev/todo-app`,
    title: "Fix flaky drag-reorder e2e test",
    hoursAgo: 100,
    turns: [
      ["u", "The e2e test for drag-reordering todos fails about 1 in 5 runs on CI with `expected [1,3,2] to equal [1,2,3]`. Local runs always pass. Find out why."],
      ["a", "It's a race: the test fires `dragover` before the list finishes its enter animation, so the drop index is computed from stale element positions. CI machines are just slow enough to lose the race. I replaced the fixed 100ms sleep with waiting for `transitionend`."],
      ["u", "did you loop it to confirm?"],
      ["a", "Ran the spec 50 times in a row — zero failures. Also removed two other fixed sleeps in the same file; the spec is 1.8s faster on average now."],
    ],
  },
  {
    cwd: `${HOME}/dotfiles`,
    title: "Profile zsh startup and lazy-load the slow parts",
    hoursAgo: 150,
    turns: [
      ["u", "my shell takes almost a second to start. profile the zshrc and split out whatever is slow"],
      ["a", "Profiled with `zprof`: nvm init is 480ms and the completion rebuild 210ms — 84% of the total. I lazy-load nvm on first `node`/`npm` call and cache `compinit` with a once-a-day rebuild check. Startup: 820ms → 95ms."],
      ["u", "ship it, but keep aliases.zsh where it is, other scripts source it"],
      ["a", "Kept `aliases.zsh` at the same path. New modules live in `zsh/modules/` behind a small loader, so adding one is just dropping a file in. Verified a fresh `zsh -lic exit` is under 100ms."],
    ],
  },
  {
    cwd: `${HOME}/dev/recipe-api`,
    title: "Cursor pagination for /recipes",
    hoursAgo: 200,
    turns: [
      ["u", "The /recipes endpoint times out once a user has a few thousand entries. Paginate it, but existing clients must keep working."],
      ["a", "Went with cursor-based pagination (offset breaks under constant inserts): `cursor` + `limit` params, an index on `(user_id, created_at, id)`, and `nextCursor` in the response. `items` keeps its old shape so existing clients are untouched."],
      ["u", "numbers?"],
      ["a", "p95 on the 10k-recipe seed went from 2.1s to 80ms. Added tests for the empty page, the exact-boundary page and a deleted-cursor row. Ready for review."],
    ],
  },
  {
    cwd: `${HOME}/work/web`,
    title: "Debug hydration mismatch on the pricing page",
    hoursAgo: 320,
    turns: [
      ["u", "Text content does not match server-rendered HTML — on /pricing, only in production. dev is fine. help"],
      ["a", "Found it: the discount banner renders `Intl.NumberFormat` with the server's locale (C/en_US in the container) but the client formats with the browser locale, so `€1.234,56` vs `€1,234.56`. Pinned the formatter to the page's explicit locale prop on both sides."],
      ["u", "why did dev not show it?"],
      ["a", "Your dev machine locale matches the browser, so both sides formatted identically. I added a Playwright check that runs the page with `LANG=C` on the server and `de-DE` in the browser to keep it from regressing."],
    ],
  },
];

const encode = (cwd) => cwd.replace(/[\\/]/g, "-");

const projectsRoot = path.join(target, "projects");
rmSync(projectsRoot, { recursive: true, force: true });

for (const s of sessions) {
  const dir = path.join(projectsRoot, encode(s.cwd));
  mkdirSync(dir, { recursive: true });
  const lines = [meta(s.cwd)];
  for (const [role, text] of s.turns) {
    lines.push(role === "u" ? user(text) : assistant(text));
  }
  lines.push(aiTitle(s.title));
  const file = path.join(dir, `${randomUUID()}.jsonl`);
  writeFileSync(file, lines.join("\n") + "\n");
  const mtime = new Date(Date.now() - s.hoursAgo * 3600 * 1000);
  utimesSync(file, mtime, mtime);
}

console.log(`demo store written to ${target} (${sessions.length} sessions)`);
console.log(`-> set the extension preference "Claude Home (.claude)" to: ${target}`);
