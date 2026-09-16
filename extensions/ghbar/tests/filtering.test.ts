import { describe, expect, it } from "vitest";
import { toSections } from "../src/core/filtering";
import {
  ALL_SECTION_KINDS,
  DISPLAY_ORDER,
  EMPTY_SOCIAL,
  Item,
  ItemKind,
  Row,
  SectionKind,
  Snapshot,
  sectionItems,
} from "../src/core/models";
import { DEFAULT_SETTINGS, Settings } from "../src/core/settings";

const BASE_EPOCH = 1_800_000_000_000; // ms

function makeItem(
  number: number,
  options: { repo?: string; kind?: ItemKind; bot?: boolean; draft?: boolean; minutesAgo?: number } = {},
): Item {
  const repo = options.repo ?? "alice/webapp";
  const minutesAgo = options.minutesAgo ?? 0;
  return {
    kind: options.kind ?? "pullRequest",
    repository: repo,
    number,
    title: `Title ${number}`,
    url: `https://github.com/${repo}/pull/${number}`,
    createdAt: new Date(BASE_EPOCH - minutesAgo * 60_000).toISOString(),
    isDraft: options.draft ?? false,
    authorLogin: options.bot ? "dependabot" : "bob",
    authorIsBot: options.bot ?? false,
  };
}

function snapshot(parts: Partial<Pick<Snapshot, "prs" | "issues" | "review" | "changesRequested" | "myPullRequests" | "truncated">> = {}): Snapshot {
  return {
    viewer: { login: "alice", name: null, avatarURL: "x", organizations: [] },
    social: EMPTY_SOCIAL,
    prs: parts.prs ?? [],
    issues: parts.issues ?? [],
    review: parts.review ?? [],
    changesRequested: parts.changesRequested ?? [],
    myPullRequests: parts.myPullRequests ?? [],
    rateLimit: { limit: 5000, remaining: 5000, resetAt: new Date(BASE_EPOCH).toISOString() },
    truncated: parts.truncated ?? [],
  };
}

function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

function section(sections: ReturnType<typeof toSections>, kind: SectionKind) {
  return sections.find((s) => s.kind === kind);
}

function numbersIn(sections: ReturnType<typeof toSections>, kind: SectionKind): number[] | undefined {
  const found = section(sections, kind);
  return found ? sectionItems(found).map((i) => i.number) : undefined;
}

describe("toSections", () => {
  it("bots are filtered out by default", () => {
    const sections = toSections(snapshot({ prs: [makeItem(1), makeItem(2, { bot: true })] }), settings());
    expect(numbersIn(sections, "pullRequests")).toEqual([1]);
  });

  it("bots stay when showBots is on", () => {
    const sections = toSections(
      snapshot({ prs: [makeItem(1), makeItem(2, { bot: true })] }),
      settings({ showBots: true }),
    );
    expect(numbersIn(sections, "pullRequests")).toHaveLength(2);
  });

  it("drafts are filtered out when showDrafts is off", () => {
    const sections = toSections(
      snapshot({ prs: [makeItem(1), makeItem(2, { draft: true })] }),
      settings({ showDrafts: false }),
    );
    expect(numbersIn(sections, "pullRequests")).toEqual([1]);
  });

  it("a PR in both prs and review appears only under Review Requested", () => {
    const shared = makeItem(204, { repo: "acme/backend" });
    const sections = toSections(snapshot({ prs: [makeItem(1), shared], review: [shared] }), settings());
    expect(numbersIn(sections, "pullRequests")).toEqual([1]);
    expect(numbersIn(sections, "reviewRequested")).toEqual([204]);
  });

  it("Changes Requested removes the same PR from weaker sections", () => {
    const shared = makeItem(204, { repo: "acme/backend" });
    const sections = toSections(
      snapshot({ prs: [makeItem(1), shared], review: [shared], changesRequested: [shared] }),
      settings(),
    );
    expect(numbersIn(sections, "pullRequests")).toEqual([1]);
    expect(section(sections, "reviewRequested")).toBeUndefined();
    expect(numbersIn(sections, "changesRequested")).toEqual([204]);
  });

  it("your own PRs land in their own section", () => {
    const mine = makeItem(91, { repo: "other/project" });
    const sections = toSections(snapshot({ prs: [makeItem(1)], myPullRequests: [mine] }), settings());
    expect(sections.map((s) => s.kind)).toEqual(["pullRequests", "myPullRequests"]);
    expect(numbersIn(sections, "myPullRequests")).toEqual([91]);
  });

  it("a changes-requested PR is not repeated under My Pull Requests", () => {
    const shared = makeItem(88);
    const sections = toSections(
      snapshot({ changesRequested: [shared], myPullRequests: [shared, makeItem(91)] }),
      settings(),
    );
    expect(numbersIn(sections, "changesRequested")).toEqual([88]);
    expect(numbersIn(sections, "myPullRequests")).toEqual([91]);
  });

  it("a self-assigned PR appears only under Pull Requests", () => {
    const shared = makeItem(42);
    const sections = toSections(snapshot({ prs: [shared], myPullRequests: [shared] }), settings());
    expect(sections.map((s) => s.kind)).toEqual(["pullRequests"]);
  });

  it("newest sorts first", () => {
    const sections = toSections(
      snapshot({
        prs: [
          makeItem(1, { minutesAgo: 500 }),
          makeItem(2, { minutesAgo: 10 }),
          makeItem(3, { minutesAgo: 100 }),
        ],
      }),
      settings(),
    );
    expect(numbersIn(sections, "pullRequests")).toEqual([2, 3, 1]);
  });

  it("a repository above the threshold collapses into one row", () => {
    const noisy = [1, 2, 3, 4, 5].map((n) => makeItem(n, { repo: "alice/noisy", kind: "issue" }));
    const quiet = [makeItem(90, { repo: "alice/webapp", kind: "issue" })];
    const sections = toSections(snapshot({ issues: [...noisy, ...quiet] }), settings({ repoGroupThreshold: 3 }));

    const rows = section(sections, "issues")!.rows;
    const groups = rows.filter((r): r is Extract<Row, { type: "group" }> => r.type === "group");
    const singles = rows.filter((r): r is Extract<Row, { type: "item" }> => r.type === "item");
    expect(groups.map((g) => g.repository)).toEqual(["alice/noisy"]);
    expect(singles.map((s) => s.item.number)).toEqual([90]);
  });

  it("a repository below the threshold is not grouped", () => {
    const items = [1, 2, 3].map((n) => makeItem(n, { repo: "alice/webapp", kind: "issue" }));
    const rows = section(toSections(snapshot({ issues: items }), settings({ repoGroupThreshold: 3 })), "issues")!.rows;
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.type === "item")).toBe(true);
  });

  it("a threshold of 0 disables grouping", () => {
    const items = [1, 2, 3, 4, 5].map((n) => makeItem(n, { repo: "alice/noisy", kind: "issue" }));
    const rows = section(toSections(snapshot({ issues: items }), settings({ repoGroupThreshold: 0 })), "issues")!.rows;
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.type === "item")).toBe(true);
  });

  it("the group sits at the position of that repository's newest item", () => {
    // alice/webapp's newest item leads, so the group belongs there too.
    const noisy = [1, 2, 3, 4].map((n) => makeItem(n, { repo: "alice/noisy", minutesAgo: 100 + n }));
    const fresh = makeItem(90, { repo: "alice/webapp", minutesAgo: 1 });
    const rows = section(
      toSections(snapshot({ prs: [...noisy, fresh] }), settings({ repoGroupThreshold: 3 })),
      "pullRequests",
    )!.rows;
    expect(rows[0].type).toBe("item");
    expect(rows[1].type).toBe("group");
  });

  it("an empty section never enters the list", () => {
    const sections = toSections(snapshot({ prs: [makeItem(1)] }), settings());
    expect(sections.map((s) => s.kind)).toEqual(["pullRequests"]);
  });

  it("a user-hidden section and its items are not processed", () => {
    const sections = toSections(
      snapshot({ prs: [makeItem(1)], issues: [makeItem(2, { kind: "issue" })], review: [makeItem(3)] }),
      settings({ showPullRequests: false, showIssues: false }),
    );
    expect(sections.map((s) => s.kind)).toEqual(["reviewRequested"]);
    expect(sections.flatMap(sectionItems).map((i) => i.number)).toEqual([3]);
  });

  it("a hidden section does NOT claim items; they fall through", () => {
    // changesRequested is a subset of myPullRequests, so claiming before the
    // visibility check made those PRs vanish from both sections.
    const shared = makeItem(88, { minutesAgo: 60 });
    const newer = makeItem(91, { minutesAgo: 5 });
    const sections = toSections(
      snapshot({ changesRequested: [shared], myPullRequests: [shared, newer] }),
      settings({ showChangesRequested: false }),
    );
    expect(sections.map((s) => s.kind)).toEqual(["myPullRequests"]);
    // 88 survives; newest-first puts it behind 91.
    expect(numbersIn(sections, "myPullRequests")).toEqual([91, 88]);
  });

  it("sections come back in urgency order", () => {
    const sections = toSections(
      snapshot({
        prs: [makeItem(1)],
        issues: [makeItem(2, { kind: "issue" })],
        review: [makeItem(3)],
        changesRequested: [makeItem(4)],
        myPullRequests: [makeItem(5)],
      }),
      settings(),
    );
    expect(sections.map((s) => s.kind)).toEqual([
      "changesRequested",
      "reviewRequested",
      "pullRequests",
      "issues",
      "myPullRequests",
    ]);
  });

  it("DISPLAY_ORDER covers every section", () => {
    expect(new Set(DISPLAY_ORDER)).toEqual(new Set(ALL_SECTION_KINDS));
    expect(DISPLAY_ORDER).toHaveLength(ALL_SECTION_KINDS.length);
  });

  it("the truncation flag carries to the section", () => {
    const sections = toSections(snapshot({ prs: [makeItem(1)], truncated: ["pullRequests"] }), settings());
    expect(sections[0].truncated).toBe(true);
  });
});
