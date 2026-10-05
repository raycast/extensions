import assert from "node:assert/strict";
import test from "node:test";

import { buildCopilotAccountCandidates } from "./accounts.ts";

test("buildCopilotAccountCandidates keeps named manual accounts first", () => {
  const accounts = buildCopilotAccountCandidates({
    manualAccounts: [
      { id: "work", label: "Work", token: "work-token" },
      { id: "personal", label: "Personal", token: "personal-token" },
    ],
    preferenceToken: "preference-token",
    cliToken: "cli-token",
    githubToken: "github-token",
    ghToken: "gh-token",
  });

  assert.deepEqual(
    accounts.map(({ id, label, token }) => ({ id, label, token })),
    [
      { id: "work", label: "Work", token: "work-token" },
      { id: "personal", label: "Personal", token: "personal-token" },
      { id: "copilot-pref", label: "Preference", token: "preference-token" },
      { id: "copilot-gh-cli", label: "GitHub CLI", token: "cli-token" },
      { id: "copilot-github-env", label: "GITHUB_TOKEN", token: "github-token" },
      { id: "copilot-gh-env", label: "GH_TOKEN", token: "gh-token" },
    ],
  );
});

test("buildCopilotAccountCandidates deduplicates tokens and preserves the first label", () => {
  const accounts = buildCopilotAccountCandidates({
    manualAccounts: [{ id: "work", label: "Work", token: " shared-token " }],
    preferenceToken: "shared-token",
    cliToken: "shared-token",
    githubToken: "shared-token",
    ghToken: "other-token",
  });

  assert.deepEqual(accounts, [
    { id: "work", label: "Work", token: "shared-token" },
    { id: "copilot-gh-env", label: "GH_TOKEN", token: "other-token" },
  ]);
});

test("buildCopilotAccountCandidates drops empty tokens", () => {
  const accounts = buildCopilotAccountCandidates({
    manualAccounts: [],
    preferenceToken: "  ",
    cliToken: null,
    githubToken: null,
    ghToken: null,
  });

  assert.deepEqual(accounts, []);
});
