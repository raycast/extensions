export type Keys =
  | "feat"
  | "fix"
  | "docs"
  | "style"
  | "refactor"
  | "perf"
  | "test"
  | "build"
  | "ci"
  | "chore"
  | "revert";

export type CommitTypes = {
  [key in Keys]: {
    description: string;
    title: string;
  };
};

export type CommitValues = {
  type: string;
  scope: string;
  subject: string;
  body: string;
  footer: string;
};
