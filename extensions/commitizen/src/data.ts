import { CommitTypes } from "./types";

export const commitTypes: CommitTypes = {
  feat: {
    title: "feat",
    description: "A new feature",
  },
  fix: {
    title: "fix",
    description: "A bug fix",
  },
  docs: {
    title: "docs",
    description: "Documentation only changes",
  },
  style: {
    title: "style",
    description:
      "Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)",
  },
  refactor: {
    title: "refactor",
    description: "A code change that neither fixes a bug nor adds a feature",
  },
  perf: {
    title: "perf",
    description: "A code change that improves performance",
  },
  test: {
    title: "test",
    description: "Adding missing tests or correcting existing tests",
  },
  build: {
    title: "build",
    description: "Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)",
  },
  ci: {
    title: "ci",
    description:
      "Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)",
  },
  chore: {
    title: "chore",
    description: "Other changes that don't modify src or test files",
  },
  revert: {
    title: "revert",
    description: "Reverts a previous commit",
  },
};

export const formFields = {
  type: {
    title: "Type",
    description: "Select the type of change that you're committing",
  },
  scope: {
    title: "Scope",
    description: "What is the scope of this change (e.g. component or file name)",
  },
  subject: {
    title: "Subject",
    description: "Write a short, imperative tense description of the change",
  },
  body: {
    title: "Body",
    description: "Provide a longer description of the change",
  },
  footer: {
    title: "Footer",
    description: "Describe the breaking changes or reference the issues",
  },
};
