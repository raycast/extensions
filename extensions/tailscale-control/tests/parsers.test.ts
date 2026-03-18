import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parseExitNodeList,
  parseNetcheckOutput,
  parsePrefsOutput,
  parseServiceStatusOutput,
  parseStatusOutput,
} from "../src/lib/parsers";

const fixturesDir = join(__dirname, "fixtures");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}

describe("parseStatusOutput", () => {
  it("parses running status and sorts online peers first", () => {
    const state = parseStatusOutput(readFixture("status-running.json"));

    expect(state.connectionState).toBe("connected");
    expect(state.self?.dnsName).toBe("callum-macbook-pro.tail.example.ts.net");
    expect(state.self?.currentExitNodeName).toBe("iPhone");
    expect(state.peers).toHaveLength(2);
    expect(state.peers[0].hostName).toBe("iPhone");
    expect(state.peers[0].online).toBe(true);
    expect(state.peers[0].taildropTarget).toBe(5);
    expect(state.peers[1].hostName).toBe("Windows PC");
    expect(state.peers[1].noFileSharingReason).toBe("File sharing disabled");
    expect(state.health[0]?.level).toBe("warning");
  });

  it("parses stopped status with auth url as needs-login", () => {
    const state = parseStatusOutput(readFixture("status-stopped.json"));

    expect(state.connectionState).toBe("needs-login");
    expect(state.backendState).toBe("Stopped");
    expect(state.authUrl).toBe("https://login.tailscale.example/auth");
    expect(state.peers).toEqual([]);
  });
});

describe("parseExitNodeList", () => {
  it("parses exit node list and marks the selected node", () => {
    const state = parseStatusOutput(readFixture("status-running.json"));
    const exitNodes = parseExitNodeList(readFixture("exit-node-list.txt"), state.peers, state.self?.currentExitNodeId);

    expect(exitNodes).toHaveLength(2);
    expect(exitNodes[0]).toMatchObject({
      id: "100.100.100.2",
      title: "iPhone",
      selected: true,
    });
    expect(exitNodes[1]?.selected).toBe(false);
  });
});

describe("parseNetcheckOutput", () => {
  it("keeps the report portion and exposes a useful summary", () => {
    const result = parseNetcheckOutput(
      "2026/03/17 13:50:29 noisy log line\nReport:\n\t* Nearest DERP: London\n\t* UDP: true",
      "2026-03-17T13:50:29.000Z",
    );

    expect(result.summary).toContain("Nearest DERP");
    expect(result.output).toContain("Report:");
    expect(result.output).not.toContain("noisy log line");
  });
});

describe("parsePrefsOutput", () => {
  it("maps debug prefs fields into dashboard toggle state", () => {
    const prefs = parsePrefsOutput(
      JSON.stringify({
        RouteAll: true,
        ExitNodeAllowLANAccess: false,
        CorpDNS: true,
        RunSSH: false,
        RunWebClient: true,
        ShieldsUp: false,
      }),
    );

    expect(prefs).toEqual({
      acceptDns: true,
      acceptRoutes: true,
      ssh: false,
      webClient: true,
      shieldsUp: false,
      exitNodeAllowLanAccess: false,
    });
  });
});

describe("parseServiceStatusOutput", () => {
  it("summarizes configured serve/funnel output", () => {
    const service = parseServiceStatusOutput(
      "serve",
      JSON.stringify({
        Web: {
          "machine.tail.example.ts.net:443": {
            Handlers: {
              "/": {
                Proxy: "http://127.0.0.1:3000",
              },
            },
          },
        },
      }),
    );

    expect(service.enabled).toBe(true);
    expect(service.summary).toContain("machine.tail.example.ts.net:443/");
    expect(service.target).toBe("http://127.0.0.1:3000");
  });

  it("returns a safe empty status when no output exists", () => {
    const service = parseServiceStatusOutput("funnel", "");

    expect(service.enabled).toBe(false);
    expect(service.summary).toBe("Not configured");
  });
});
