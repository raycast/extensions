import assert from "node:assert/strict";
import test from "node:test";

import type { GlobalSearchResult } from "./protocol.ts";

import { ALL_SEARCH_CATEGORIES, blumeDeepLinkForResult, categoriesForFilter, resultSubtitle } from "./searchModel.ts";

test("Raycast searches every category through the shared global-search contract", () => {
  assert.deepEqual(categoriesForFilter("all"), ALL_SEARCH_CATEGORIES);
  assert.deepEqual(categoriesForFilter("messages"), ["messages"]);
});

test("search results map to the existing Blume deep-link routes", () => {
  const conversation: GlobalSearchResult = {
    id: "conversation-1",
    category: "conversations",
    title: "Search architecture",
    subtitle: "Blume",
    excerpt: null,
    rank: 0,
    updatedAt: 1,
    conversationRef: "codex/project/thread",
    conversationId: "conversation-1",
    projectId: "project-1",
    workspaceLocationId: null,
    harnessId: "codex",
  };
  const conversationLink = blumeDeepLinkForResult(conversation);
  assert.equal(conversationLink, "blume://agents/codex%2Fproject%2Fthread");
  assert.equal(blumeDeepLinkForResult(conversation, "blume-canary"), "blume-canary://agents/codex%2Fproject%2Fthread");

  const setup: GlobalSearchResult = {
    id: "setup-1",
    category: "setup",
    title: "Review skill",
    subtitle: null,
    excerpt: "Review every change",
    rank: 0,
    updatedAt: 1,
    artifactId: "setup-1",
    projectId: "project-1",
    harnessId: "codex",
    sourcePath: "/code/.agents/skills/review/SKILL.md",
  };
  assert.equal(blumeDeepLinkForResult(setup), "blume://setup/codex/entries/SKILL.md");
  assert.equal(resultSubtitle(setup), "Review every change");
});
