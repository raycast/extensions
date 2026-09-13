import { describe, expect, test } from "bun:test";
import {
  connectionHandoffCode,
  directReconnectClient,
  handoffFromExecution,
  integrationDetailUrl,
  needsReconnect,
  newlyCreatedConnection,
  oauthClientDisplayName,
  validatedIntegrationUrl,
} from "../src/lib/connection-actions";
import type { Connection } from "../src/lib/types";

const connection = (overrides: Partial<Connection> = {}): Connection => ({
  owner: "user",
  name: "personal",
  integration: "linear",
  template: "oauth",
  provider: "oauth",
  address: "linear.user.personal",
  oauthClient: "linear-app",
  oauthClientOwner: "user",
  missingOAuthScopes: [],
  ...overrides,
});

const integration = {
  slug: "linear",
  name: "Linear",
  description: "",
  kind: "openapi",
  canRemove: true,
  canRefresh: true,
  authMethods: [{ id: "oauth", label: "OAuth", kind: "oauth", template: "oauth" }],
};

describe("connection management boundaries", () => {
  test("OAuth app labels match Executor without changing identifiers", () => {
    expect(oauthClientDisplayName("google")).toBe("Google");
    expect(oauthClientDisplayName("first-party:google")).toBe("Google");
    expect(oauthClientDisplayName("team_app-prod")).toBe("Team app prod");
    expect(oauthClientDisplayName("MTA")).toBe("MTA");
  });
  test("reconnect is driven by confirmed health or missing scopes, never token expiry alone", () => {
    expect(needsReconnect(connection({ expiresAt: 1 }))).toBe(false);
    expect(needsReconnect(connection({ lastHealth: { status: "expired", checkedAt: 1 } }))).toBe(true);
    expect(needsReconnect(connection({ missingOAuthScopes: ["issues:write"] }))).toBe(true);
  });

  test("only a fresh matching manual or first-party binding takes the direct OAuth path", () => {
    const manual = {
      owner: "user" as const,
      slug: "linear-app",
      grant: "authorization_code" as const,
      origin: { kind: "manual" as const },
    };
    expect(directReconnectClient([manual], connection(), integration)?.slug).toBe("linear-app");
    expect(
      directReconnectClient(
        [{ ...manual, origin: { kind: "dynamic_client_registration" as const } }],
        connection(),
        integration,
      ),
    ).toBeUndefined();
    expect(directReconnectClient([{ ...manual, grant: "id_jag" as const }], connection(), integration)).toBeUndefined();
    expect(directReconnectClient([], connection(), integration)).toBeUndefined();
    expect(directReconnectClient([{ ...manual, owner: "org" }], connection(), integration)).toBeUndefined();
  });

  test("enterprise OAuth methods always hand off to Executor", () => {
    const enterprise = {
      ...integration,
      authMethods: [
        {
          ...integration.authMethods[0],
          oauth: { enterpriseIdentityProvider: { client: "okta", clientOwner: "org" as const } },
        },
      ],
    };
    const client = {
      owner: "user" as const,
      slug: "linear-app",
      grant: "authorization_code" as const,
      origin: { kind: "manual" as const },
    };
    expect(directReconnectClient([client], connection(), enterprise)).toBeUndefined();
  });

  test("handoff code serializes untrusted labels as data", async () => {
    const calls: unknown[] = [];
    const code = connectionHandoffCode({ integration: "linear", label: '` ${process.exit()} "' });
    await new Function("tools", `return (async () => { ${code} })()`)({
      "executor.coreTools.connections.createHandoff": (input: unknown) => calls.push(input),
    });
    expect(calls).toEqual([{ integration: "linear", label: '` ${process.exit()} "' }]);
  });

  test("accepts only same-origin integration handoffs and can derive the detail page", () => {
    const handoff = "https://executor.sh/acme/integrations/linear?addAccount=1&owner=user";
    expect(validatedIntegrationUrl(handoff, "https://executor.sh", "linear")).toBe(handoff);
    expect(integrationDetailUrl(handoff)).toBe("https://executor.sh/acme/integrations/linear");
    expect(
      validatedIntegrationUrl("https://evil.example/integrations/linear", "https://executor.sh", "linear"),
    ).toBeUndefined();
    expect(
      validatedIntegrationUrl("https://executor.sh/integrations/github", "https://executor.sh", "linear"),
    ).toBeUndefined();
  });

  test("extracts only a successful structured handoff", () => {
    const result = {
      status: "completed" as const,
      isError: false,
      text: "",
      structured: {
        result: {
          ok: true,
          data: { url: "https://executor.sh/integrations/linear?addAccount=1", instructions: "Open it" },
        },
      },
    };
    expect(handoffFromExecution(result)?.instructions).toBe("Open it");
    expect(handoffFromExecution({ ...result, isError: true })).toBeUndefined();
  });

  test("checks the immutable submitted scope when the form selection later changes", () => {
    const target = {
      integration: "linear",
      owner: "user" as const,
      template: "oauth",
      baseline: new Set(["linear.user.old"]),
    };
    const unrelated = connection({ integration: "github", address: "github.user.new" });
    const wrongTemplate = connection({ address: "linear.user.key", template: "api-key" });
    const submitted = connection({ address: "linear.user.new" });
    expect(newlyCreatedConnection(target, [unrelated, wrongTemplate])).toBeUndefined();
    expect(newlyCreatedConnection(target, [unrelated, submitted])?.address).toBe("linear.user.new");
  });
});
