import { describe, expect, it } from "vitest";
import { normalizeDeployment, normalizeServer, normalizeSite, toForgeTimestamp } from "../normalize";
import type { DeploymentAttributes, ServerAttributes, SiteAttributes } from "../../lib/jsonapi";
import type { JsonApiResource } from "../../lib/jsonapi";

describe("toForgeTimestamp", () => {
  it("reformats ISO-8601 into space-separated UTC that survives a ' UTC' suffix", () => {
    const out = toForgeTimestamp("2025-07-29T09:00:00Z");
    expect(out).toBe("2025-07-29 09:00:00");
    expect(isNaN(new Date(out + " UTC").getTime())).toBe(false);
  });
  it("returns undefined for null/empty/invalid", () => {
    expect(toForgeTimestamp(null)).toBeUndefined();
    expect(toForgeTimestamp("")).toBeUndefined();
    expect(toForgeTimestamp("not-a-date")).toBeUndefined();
  });
});

describe("normalizeServer", () => {
  it("flattens attributes and stamps context", () => {
    const resource: JsonApiResource<ServerAttributes> = {
      id: "42",
      type: "servers",
      attributes: {
        id: 42,
        name: "web-1",
        provider: "aws",
        identifier: "i-123",
        ip_address: "1.2.3.4",
        ssh_port: 22,
        revoked: false,
        is_ready: true,
        credential_id: 7,
        created_at: "2025-07-29T09:00:00Z",
      },
    };
    const server = normalizeServer(resource, { org_slug: "acme", api_token_key: "k1", ssh_user: "forge" });
    expect(server.id).toBe("42");
    expect(server.org_slug).toBe("acme");
    expect(server.api_token_key).toBe("k1");
    expect(server.ssh_user).toBe("forge");
    expect(server.provider).toBe("aws");
    expect(server.provider_id).toBe("i-123");
    expect(server.ip_address).toBe("1.2.3.4");
    expect(server.credential_id).toBe("7");
    expect(server.created_at).toBe("2025-07-29 09:00:00");
  });
});

describe("normalizeSite", () => {
  it("flattens repository object and reads server id from relationships", () => {
    const resource: JsonApiResource<SiteAttributes> = {
      id: "99",
      type: "sites",
      attributes: {
        name: "example.com",
        status: "installed",
        user: "forge",
        https: true,
        web_directory: "/public",
        aliases: ["www.example.com"],
        deployment_status: "deploying",
        quick_deploy: true,
        deployment_url: "https://hook",
        app_type: "php",
        repository: { provider: "github", url: "org/repo", branch: "main", status: "installed" },
      },
      relationships: { server: { data: { id: "42", type: "servers" } } },
    };
    const site = normalizeSite(resource, { org_slug: "acme" });
    expect(site.id).toBe("99");
    expect(site.server_id).toBe("42");
    expect(site.org_slug).toBe("acme");
    expect(site.username).toBe("forge");
    expect(site.is_secured).toBe(true);
    expect(site.directory).toBe("/public");
    expect(site.repository).toBe("org/repo");
    expect(site.repository_branch).toBe("main");
    expect(site.repository_provider).toBe("github");
    expect(site.deployment_status).toBe("deploying");
    expect(site.project_type).toBe("php");
  });
  it("leaves repository undefined when there is no repo", () => {
    const resource: JsonApiResource<SiteAttributes> = {
      id: "5",
      type: "sites",
      attributes: { name: "static.example.com", repository: null },
      relationships: { server: { data: null } },
    };
    const site = normalizeSite(resource, { org_slug: "acme" });
    expect(site.repository).toBeUndefined();
    expect(site.server_id).toBe("");
  });
  it("falls back to ctx.server_id when the relationship omits the server", () => {
    const resource: JsonApiResource<SiteAttributes> = {
      id: "7",
      type: "sites",
      attributes: { name: "example.com", repository: null },
      relationships: { server: { data: null } },
    };
    const site = normalizeSite(resource, { org_slug: "acme", server_id: "42" });
    expect(site.server_id).toBe("42");
  });
  it("extracts server id from deployment_url when the org-level endpoint omits it elsewhere", () => {
    // The /orgs/{slug}/sites endpoint carries no server relationship or attribute;
    // the id only appears in the deployment_url path.
    const resource: JsonApiResource<SiteAttributes> = {
      id: "489565",
      type: "sites",
      attributes: {
        name: "staging.example.com",
        repository: null,
        deployment_url: "https://forge.laravel.com/servers/184049/sites/489565/deploy/http?token=abc",
      },
    };
    const site = normalizeSite(resource, { org_slug: "acme" });
    expect(site.server_id).toBe("184049");
  });
});

describe("normalizeDeployment", () => {
  it("flattens the commit object and reformats timestamps", () => {
    const resource: JsonApiResource<DeploymentAttributes> = {
      id: "1000",
      type: "deployments",
      attributes: {
        commit: { hash: "abc123", author: "Jane", message: "Fix bug", branch: "main" },
        type: "web",
        status: "finished",
        started_at: "2025-07-29T09:00:00Z",
        ended_at: "2025-07-29T09:01:30Z",
      },
    };
    const d = normalizeDeployment(resource, { server_id: "42", site_id: "99" });
    expect(d.id).toBe("1000");
    expect(d.commit_hash).toBe("abc123");
    expect(d.commit_author).toBe("Jane");
    expect(d.commit_message).toBe("Fix bug");
    expect(d.displayable_type).toBe("web");
    expect(d.status).toBe("finished");
    expect(d.started_at).toBe("2025-07-29 09:00:00");
    expect(d.ended_at).toBe("2025-07-29 09:01:30");
    expect(d.server_id).toBe("42");
    expect(d.site_id).toBe("99");
  });
});
