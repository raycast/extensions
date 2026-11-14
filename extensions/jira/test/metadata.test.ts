import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import { describe, it } from "node:test";

import { loadModule } from "./helpers/loadModule.ts";

type IssueType = { id: string; name: string; iconUrl: string; subtask: boolean };
type IssuesModule = {
  getCreateIssueMetadataSummary(projectId: string): Promise<{ issuetypes: IssueType[] }[]>;
  resolveIssueTypeIconUris(issueType: IssueType): Promise<IssueType>;
};

function loadIssues(
  fetchIcon: (url: string) => Promise<string>,
  issueTypes: IssueType[] = [],
  getJiraCredentials = () => ({ siteUrl: "example.atlassian.net", myself: { accountId: "me" } }),
) {
  return loadModule<IssuesModule>("src/api/issues.ts", {
    "date-fns": {},
    "form-data": {},
    marklassian: {},
    "../helpers/customFields": {},
    "./request": {
      request: async () => ({ projects: [{ issuetypes: issueTypes }] }),
      getAuthenticatedUri: fetchIcon,
    },
    "./jiraCredentials": { getJiraCredentials },
  });
}

function issueType(id: number): IssueType {
  return { id: String(id), name: "Bug", subtask: false, iconUrl: `https://example.atlassian.net/icon/${id}` };
}

describe("issue type icons", () => {
  it("bounds concurrent downloads across a project with 100 distinct issue type icons", async () => {
    let active = 0;
    let peak = 0;
    let calls = 0;
    const types = Array.from({ length: 100 }, (_, id) => issueType(id));
    const issues = loadIssues(async () => {
      calls += 1;
      active += 1;
      peak = Math.max(active, peak);
      await setTimeout(1);
      active -= 1;
      return "data:image/png;base64,AA==";
    }, types);

    const result = await issues.getCreateIssueMetadataSummary("10000");

    assert.equal(calls, 100);
    assert.ok(peak <= 4, `peak concurrent downloads was ${peak}`);
    assert.ok(result[0].issuetypes.every((type) => type.iconUrl.startsWith("data:")));
  });

  it("shares one in-flight download for the same icon", async () => {
    let calls = 0;
    const issues = loadIssues(async () => {
      calls += 1;
      await setTimeout(1);
      return "data:image/png;base64,AA==";
    });
    await Promise.all(Array.from({ length: 20 }, () => issues.resolveIssueTypeIconUris(issueType(1))));
    assert.equal(calls, 1);
  });

  it("evicts old icon data instead of retaining every image for the lifetime of the command", async () => {
    let calls = 0;
    const issues = loadIssues(async () => {
      calls += 1;
      return "data:image/png;base64,AA==";
    });
    for (let id = 0; id < 200; id++) await issues.resolveIssueTypeIconUris(issueType(id));
    await issues.resolveIssueTypeIconUris(issueType(0));
    assert.equal(calls, 201);
  });

  it("keeps the original URL after a failed icon request and retries on the next load", async () => {
    let calls = 0;
    const issues = loadIssues(async () => {
      calls += 1;
      if (calls === 1) throw new Error("rate limited");
      return "data:image/png;base64,AA==";
    });
    const first = issueType(1);
    await issues.resolveIssueTypeIconUris(first);
    assert.equal(first.iconUrl, "https://example.atlassian.net/icon/1");
    const second = issueType(1);
    await issues.resolveIssueTypeIconUris(second);
    assert.equal(second.iconUrl, "data:image/png;base64,AA==");
    assert.equal(calls, 2);
  });

  it("does not reuse authenticated icon data across sites or accounts", async () => {
    let calls = 0;
    let credentials = { siteUrl: "first.atlassian.net", myself: { accountId: "first-user" } };
    const issues = loadIssues(
      async () => {
        calls += 1;
        return `data:image/png;base64,${calls}`;
      },
      [],
      () => credentials,
    );

    await issues.resolveIssueTypeIconUris(issueType(1));
    credentials = { siteUrl: "second.atlassian.net", myself: { accountId: "first-user" } };
    await issues.resolveIssueTypeIconUris(issueType(1));
    credentials = { siteUrl: "second.atlassian.net", myself: { accountId: "second-user" } };
    const third = await issues.resolveIssueTypeIconUris(issueType(1));

    assert.equal(calls, 3);
    assert.equal(third.iconUrl, "data:image/png;base64,3");
  });

  it("continues queued downloads after the active requests fail", async () => {
    let calls = 0;
    const types = Array.from({ length: 20 }, (_, id) => issueType(id));
    const issues = loadIssues(async () => {
      const call = ++calls;
      await setTimeout(1);
      if (call <= 4) throw new Error("rate limited");
      return "data:image/png;base64,AA==";
    }, types);

    const result = await issues.getCreateIssueMetadataSummary("10000");

    assert.equal(calls, 20);
    assert.equal(result[0].issuetypes.filter((type) => type.iconUrl.startsWith("data:")).length, 16);
  });

  it("discards in-flight icons and queued requests when the signed-in account changes", async () => {
    let accountId = "first-user";
    let calls = 0;
    const gate = Promise.withResolvers<void>();
    const issues = loadIssues(
      async () => {
        calls += 1;
        await gate.promise;
        return `data:image/png;base64,${accountId}`;
      },
      [],
      () => ({ siteUrl: "example.atlassian.net", myself: { accountId } }),
    );
    const original = Array.from({ length: 5 }, (_, id) => issueType(id));
    const pending = Promise.all(original.map((type) => issues.resolveIssueTypeIconUris(type)));

    assert.equal(calls, 4);
    accountId = "second-user";
    gate.resolve();
    await pending;

    assert.equal(calls, 4, "queued requests must not use the new account's credentials");
    assert.ok(
      original.every((type) => type.iconUrl.startsWith("https:")),
      "stale results must not replace icons",
    );

    accountId = "first-user";
    const reloaded = await issues.resolveIssueTypeIconUris(issueType(4));
    assert.equal(calls, 5);
    assert.equal(reloaded.iconUrl, "data:image/png;base64,first-user");
  });

  it("preserves an optional icon when credentials are no longer available", async () => {
    const issues = loadIssues(
      async () => {
        throw new Error("must not start an unauthenticated request");
      },
      [],
      () => {
        throw new Error("getJiraCredentials must be used when authenticated");
      },
    );
    const type = issueType(1);
    await issues.resolveIssueTypeIconUris(type);
    assert.equal(type.iconUrl, "https://example.atlassian.net/icon/1");
  });
});
