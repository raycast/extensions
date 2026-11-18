import { deepEqual, equal, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { loadModule } from "./helpers/loadModule.ts";

type CredentialModule = {
  jira: {
    onAuthorize: (params: { token: string }) => Promise<void>;
    client: { authorize: () => Promise<void> };
  };
  jiraWithApiToken: { authorize: () => Promise<string> };
  getJiraCredentials: () => { siteUrl: string; cloudId?: string; authorizationHeader: string };
  getJiraCacheKey: () => string;
};

function loadCredentials(siteUrl = "", cachedSites = new Map<string, string>()) {
  const calls: string[] = [];
  let accountId = "person";
  let deferredMyself: { waiting: () => void; response: Promise<void> } | undefined;
  const sites = [
    { id: "wrong-cloud", url: "https://wrong.atlassian.net" },
    { id: "chosen-cloud", url: "https://chosen.atlassian.net" },
  ];
  const fetch = async (url: string) => {
    calls.push(url);
    const data = url.endsWith("accessible-resources") ? sites : { accountId, displayName: "Person" };
    if (url.endsWith("/myself") && deferredMyself) {
      const deferred = deferredMyself;
      deferredMyself = undefined;
      deferred.waiting();
      await deferred.response;
    }
    return { data };
  };
  const credentials = loadModule<CredentialModule>("src/api/jiraCredentials.ts", {
    "@raycast/api": {
      getPreferenceValues: () => ({ siteUrl, email: "person@example.com", token: "api-token" }),
      Cache: class {
        get(key: string) {
          return cachedSites.get(key);
        }
        set(key: string, value: string) {
          cachedSites.set(key, value);
        }
        remove(key: string) {
          cachedSites.delete(key);
        }
        clear() {
          cachedSites.clear();
        }
      },
    },
    "@raycast/utils": {
      OAuthService: {
        jira: (options: Pick<CredentialModule["jira"], "onAuthorize">) => ({
          client: { authorize: async () => undefined },
          onAuthorize: options.onAuthorize,
        }),
      },
    },
    "node-fetch": fetch,
    "./fetch": fetch,
    "./response": { parseJiraResponse: async (response: { data: unknown }) => response.data },
  });
  return {
    ...credentials,
    calls,
    cachedSites,
    setSiteUrl: (value: string) => {
      siteUrl = value;
    },
    setAccountId: (value: string) => {
      accountId = value;
    },
    deferNextMyself: () => {
      const started = Promise.withResolvers<void>();
      const response = Promise.withResolvers<void>();
      deferredMyself = { waiting: started.resolve, response: response.promise };
      return { started: started.promise, release: response.resolve };
    },
  };
}

describe("Jira OAuth credentials", () => {
  it("selects the configured site instead of the first accessible resource", async () => {
    const credentials = loadCredentials("chosen.atlassian.net/");
    await credentials.jira.onAuthorize({ token: "oauth-token" });
    equal(credentials.getJiraCredentials().cloudId, "chosen-cloud");
    equal(credentials.getJiraCredentials().siteUrl, "https://chosen.atlassian.net");
    equal(credentials.calls[1], "https://api.atlassian.com/ex/jira/chosen-cloud/rest/api/3/myself");
  });

  it("rejects a configured site that is absent from accessible resources", async () => {
    const credentials = loadCredentials("https://unavailable.atlassian.net");
    await rejects(credentials.jira.onAuthorize({ token: "oauth-token" }), /not accessible/);
    equal(credentials.calls.length, 1);
  });

  it("does not reuse the default-site cache after choosing a different site", async () => {
    const cachedSites = new Map([
      [
        "oauth",
        JSON.stringify({
          cloudId: "wrong-cloud",
          siteUrl: "https://wrong.atlassian.net",
          myself: { accountId: "person" },
        }),
      ],
    ]);
    const credentials = loadCredentials("https://chosen.atlassian.net/", cachedSites);
    await credentials.jira.onAuthorize({ token: "oauth-token" });
    equal(credentials.getJiraCredentials().cloudId, "chosen-cloud");
  });

  it("initializes credentials before the authorization callback resolves", async () => {
    const credentials = loadCredentials();
    await credentials.jira.onAuthorize({ token: "oauth-token" });
    deepEqual(credentials.getJiraCredentials(), {
      cloudId: "wrong-cloud",
      siteUrl: "https://wrong.atlassian.net",
      myself: { accountId: "person", displayName: "Person" },
      authorizationHeader: "Bearer oauth-token",
    });
  });

  it("reuses only the selected site's cached identity with the current access token", async () => {
    const credentials = loadCredentials("https://chosen.atlassian.net/");
    await credentials.jira.onAuthorize({ token: "first-token" });
    await credentials.jira.onAuthorize({ token: "refreshed-token" });
    equal(credentials.getJiraCredentials().authorizationHeader, "Bearer refreshed-token");
    equal(credentials.getJiraCacheKey(), "chosen-cloud:person");
  });

  it("drops the selected site's credentials before a browser sign-in can change account", async () => {
    const credentials = loadCredentials("https://chosen.atlassian.net/");
    await credentials.jira.onAuthorize({ token: "first-token" });
    equal(credentials.cachedSites.size, 1);
    await credentials.jira.client.authorize();
    equal(credentials.cachedSites.size, 0);
  });

  it("drops every previously cached site when browser sign-in connects a different account", async () => {
    const credentials = loadCredentials("https://wrong.atlassian.net/");
    await credentials.jira.onAuthorize({ token: "account-a-token" });
    credentials.setSiteUrl("https://chosen.atlassian.net/");
    await credentials.jira.onAuthorize({ token: "account-a-token" });
    equal(credentials.cachedSites.size, 2);

    credentials.setAccountId("person-b");
    await credentials.jira.client.authorize();
    equal(credentials.cachedSites.size, 0);
    await credentials.jira.onAuthorize({ token: "account-b-token" });
    equal(credentials.getJiraCacheKey(), "chosen-cloud:person-b");

    credentials.setSiteUrl("https://wrong.atlassian.net/");
    await credentials.jira.onAuthorize({ token: "account-b-token" });
    equal(credentials.getJiraCacheKey(), "wrong-cloud:person-b");
    equal(credentials.getJiraCredentials().authorizationHeader, "Bearer account-b-token");
  });

  it("does not restore the old account when its background identity refresh finishes after browser sign-in", async () => {
    const credentials = loadCredentials("https://chosen.atlassian.net/");
    await credentials.jira.onAuthorize({ token: "account-a-token" });
    const pending = credentials.deferNextMyself();
    await credentials.jira.onAuthorize({ token: "account-a-token" });
    await pending.started;

    credentials.setAccountId("person-b");
    await credentials.jira.client.authorize();
    await credentials.jira.onAuthorize({ token: "account-b-token" });
    equal(credentials.getJiraCacheKey(), "chosen-cloud:person-b");
    pending.release();
    await new Promise((resolve) => setImmediate(resolve));
    equal(credentials.getJiraCacheKey(), "chosen-cloud:person-b");
    equal(credentials.getJiraCredentials().authorizationHeader, "Bearer account-b-token");
  });

  it("does not overwrite a newer access token when an older background refresh finishes later", async () => {
    const credentials = loadCredentials("https://chosen.atlassian.net/");
    await credentials.jira.onAuthorize({ token: "old-token" });
    const pending = credentials.deferNextMyself();
    await credentials.jira.onAuthorize({ token: "old-token" });
    await pending.started;
    await credentials.jira.onAuthorize({ token: "new-token" });
    await new Promise((resolve) => setImmediate(resolve));
    pending.release();
    await new Promise((resolve) => setImmediate(resolve));
    equal(credentials.getJiraCredentials().authorizationHeader, "Bearer new-token");
  });

  it("isolates identities when an old Raycast worker refreshes after another worker switches accounts", async () => {
    const sharedCache = new Map<string, string>();
    const oldWorker = loadCredentials("https://chosen.atlassian.net/", sharedCache);
    await oldWorker.jira.onAuthorize({ token: "account-a-token" });
    const pending = oldWorker.deferNextMyself();
    await oldWorker.jira.onAuthorize({ token: "account-a-token" });
    await pending.started;

    const newWorker = loadCredentials("https://chosen.atlassian.net/", sharedCache);
    newWorker.setAccountId("person-b");
    await newWorker.jira.client.authorize();
    await newWorker.jira.onAuthorize({ token: "account-b-token" });
    equal(newWorker.getJiraCacheKey(), "chosen-cloud:person-b");
    pending.release();
    await new Promise((resolve) => setImmediate(resolve));

    const nextLaunch = loadCredentials("https://chosen.atlassian.net/", sharedCache);
    nextLaunch.setAccountId("person-b");
    await nextLaunch.jira.onAuthorize({ token: "account-b-token" });
    equal(nextLaunch.getJiraCacheKey(), "chosen-cloud:person-b");
    equal(
      [...sharedCache.keys()].some((key) => key.includes("account-a-token") || key.includes("account-b-token")),
      false,
    );
  });

  it("initializes API-token credentials before authorize resolves, including cache reuse", async () => {
    const credentials = loadCredentials("https://chosen.atlassian.net/");
    equal(await credentials.jiraWithApiToken.authorize(), "api-token");
    equal(credentials.getJiraCredentials().siteUrl, "chosen.atlassian.net");
    equal(credentials.getJiraCredentials().authorizationHeader, `Basic ${btoa("person@example.com:api-token")}`);
    equal(await credentials.jiraWithApiToken.authorize(), "api-token");
    equal(credentials.getJiraCredentials().siteUrl, "chosen.atlassian.net");
  });

  it("keeps cached team results separate when the authenticated Jira site changes", () => {
    let accountKey = "first-cloud:person";
    const teamData = new Map([
      ["first-cloud:person", [{ teamId: "first-team", displayName: "First team" }]],
      ["chosen-cloud:person", [{ teamId: "chosen-team", displayName: "Chosen team" }]],
    ]);
    const jsx = (type: unknown, props: unknown) => ({ type, props });
    const cacheHooks = loadModule("src/hooks/useJiraCache.ts", {
      "../api/jiraCredentials": { getJiraCacheKey: () => accountKey },
      "@raycast/utils": {
        useCachedPromise: (_callback: unknown, args: Array<{ accountKey: string }>) => ({
          data: teamData.get(args[0].accountKey),
        }),
      },
    });
    const { FormTeamDropdown } = loadModule<{ FormTeamDropdown: (props: { name: string }) => unknown }>(
      "src/components/FormTeamDropdown.tsx",
      {
        "@raycast/api": { Form: { Dropdown: { Item: "Dropdown.Item" } }, Icon: { TwoPeople: "team" } },
        "../hooks/useJiraCache": cacheHooks,
        "../api/jiraCredentials": { getJiraCacheKey: () => accountKey },
        "../api/teams": { getTeams: async () => [] },
        "react/jsx-runtime": { jsx, jsxs: jsx },
      },
    );
    equal(JSON.stringify(FormTeamDropdown({ name: "Team" })).includes("First team"), true);
    accountKey = "chosen-cloud:person";
    const result = JSON.stringify(FormTeamDropdown({ name: "Team" }));
    equal(result.includes("Chosen team"), true);
    equal(result.includes("First team"), false);
  });
});
