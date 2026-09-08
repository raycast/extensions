import { describe, expect, it } from "vitest";
import { askedFor, included, namesAsked, pick, serverIncludable, siteLinks } from "../../src/tools/fields";
import { IServer } from "../../src/types";

const server = { id: 9001, name: "web-1", org_slug: "acme-inc", slug: "web-1" } as IServer;

describe("namesAsked", () => {
  it("splits, trims and drops the blanks", () => {
    expect(namesAsked(" a, b ,,c ")).toEqual(["a", "b", "c"]);
    expect(namesAsked(undefined)).toEqual([]);
  });
});

describe("pick", () => {
  it("matches however the name is spelled", () => {
    const available = { zeroDowntimeDeployments: true, phpVersion: "8.3" };
    expect(pick(available, ["zero_downtime_deployments", "PHP-VERSION"]).picked).toEqual({
      zeroDowntimeDeployments: true,
      phpVersion: "8.3",
    });
  });

  it("reports a name it could not place", () => {
    expect(pick({ a: 1 }, ["nope"]).unknown).toEqual(["nope"]);
  });
});

describe("askedFor", () => {
  it("returns the asked column and nothing else", () => {
    const asked = askedFor("site", "zero_downtime_deployments");
    const row = asked.from({ zeroDowntimeDeployments: false, phpVersion: "8.3" } as never);
    expect(row).toEqual({ zeroDowntimeDeployments: false });
  });

  it("keeps false, which JSON must not confuse with absent", () => {
    const asked = askedFor("site", "quick_deploy");
    expect(asked.from({ quickDeploy: false } as never)).toEqual({ quickDeploy: false });
  });

  it("emits null rather than undefined, which JSON.stringify would drop", () => {
    const asked = askedFor("site", "healthcheck_url");
    const row = asked.from({} as never);
    expect(Object.keys(row)).toEqual(["healthcheckUrl"]);
    expect(JSON.parse(JSON.stringify(row))).toEqual({ healthcheckUrl: null });
  });

  it("says a column the row already carries is redundant, not unknown", () => {
    expect(askedFor("site", "name").notes.join(" ")).toMatch(/already/);
  });

  it("points a withheld field at include rather than blaming Forge", () => {
    const note = askedFor("server", "local_public_key").notes.join(" ");
    expect(note).toMatch(/withheld/i);
    expect(note).not.toMatch(/Forge holds|Forge does not hand/);
  });

  it("points an unreadable field at the get tool's Forge link", () => {
    const note = askedFor("site", "environment").notes.join(" ");
    expect(note).toMatch(/never returned by this extension/i);
    expect(note).toMatch(/get-site/);
  });

  it("sends a genuinely unknown name back to probe-api", () => {
    expect(askedFor("site", "bananas").notes.join(" ")).toMatch(/no site field called bananas.*probe-api/i);
  });

  it("adds an ensured column without the model asking, and still reports nothing was asked", () => {
    const asked = askedFor("server", undefined, { ensure: ["revoked"] });
    expect(asked.from({ revoked: true } as never)).toEqual({ revoked: true });
    expect(asked.requested).toBe(false);
  });
});

describe("included", () => {
  it("returns only what was named and explains the rest", () => {
    const out = included(
      serverIncludable({ credential_id: 7, local_public_key: "ssh-rsa AAA" } as IServer),
      "local_public_key",
    ) as Record<string, unknown>;
    expect(out.localPublicKey).toBe("ssh-rsa AAA");
    expect(String(out.credentialId)).toMatch(/Withheld unless asked/);
  });

  it("answers a named field Forge left empty rather than dropping the key", () => {
    // undefined would vanish from the JSON, reading as a field Forge does not have
    const out = included(serverIncludable({ local_public_key: "k" } as IServer), "credential_id");
    expect(JSON.parse(JSON.stringify(out))).toMatchObject({ credentialId: null });
  });

  it("withholds everything when nothing is named", () => {
    const out = included(serverIncludable({ credential_id: 7, local_public_key: "k" } as IServer), undefined) as Record<
      string,
      unknown
    >;
    expect(String(out.localPublicKey)).toMatch(/Withheld/);
  });
});

describe("siteLinks", () => {
  it("names each withheld file and links where the user can open it", () => {
    const links = siteLinks(server, 5001);
    expect(links.environment).toContain("[Environment](https://forge.laravel.com/acme-inc/web-1/5001/environment)");
    expect(links.deploymentUrl).toContain("/settings/deployments");
    expect(links.environment).toMatch(/not returned by this extension/i);
  });

  it("still says the field is withheld when no Forge URL can be built", () => {
    const links = siteLinks({ id: 1 } as IServer, 5001);
    expect(links.environment).toMatch(/not returned by this extension/i);
    expect(links.environment).not.toContain("](");
  });

  it("never returns the value itself", () => {
    const links = siteLinks(server, 5001) as Record<string, string>;
    for (const value of Object.values(links)) expect(value).toMatch(/^Not returned/);
  });
});

describe("the redundant list tracks the rows the tools actually return", () => {
  it("calls a column the site row carries redundant", () => {
    expect(askedFor("site", "status").notes.join(" ")).toMatch(/already/);
    expect(askedFor("site", "server_id").notes.join(" ")).toMatch(/already/);
  });

  it("does not claim the site row carries url, which it no longer does", () => {
    const asked = askedFor("site", "url");
    expect(asked.notes.join(" ")).not.toMatch(/already/);
  });

  it("does not claim the server row carries isReady, which it no longer does", () => {
    expect(askedFor("server", "is_ready").notes.join(" ")).not.toMatch(/already/);
  });
});
