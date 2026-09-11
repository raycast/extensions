export const IssueKind = {
  Issue: "issues",
  PullRequest: "pulls",
} as const;

export type IssueKind = (typeof IssueKind)[keyof typeof IssueKind];

type IssueKindPresentation = {
  createFallbackKey: string;
  copyNumberTitle: string;
  openTitle: string;
};

export const IssueKindPresentation = {
  [IssueKind.Issue]: {
    createFallbackKey: "issue",
    copyNumberTitle: "Copy Issue Number",
    openTitle: "Open Issue",
  },
  [IssueKind.PullRequest]: {
    createFallbackKey: "pull-request",
    copyNumberTitle: "Copy Pull Request Number",
    openTitle: "Open Pull Request",
  },
} as const satisfies Record<IssueKind, IssueKindPresentation>;
