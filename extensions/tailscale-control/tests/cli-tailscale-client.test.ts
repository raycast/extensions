import { beforeEach, describe, expect, it, vi } from "vitest";

import { CliTailscaleClient } from "../src/clients/cli-tailscale-client";
import { TailscaleCommandError } from "../src/lib/errors";

const runExecFileMock = vi.fn();

describe("CliTailscaleClient", () => {
  beforeEach(() => {
    runExecFileMock.mockReset();
  });

  it("loads dashboard state using all configured data sources", async () => {
    runExecFileMock
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          BackendState: "Running",
          Self: { ID: "self", HostName: "MacBook", Online: true, TailscaleIPs: ["100.64.0.1"] },
          Peer: {},
          Health: [],
        }),
        stderr: 'Warning: client version "1.0" != tailscaled server version "1.1"',
      })
      .mockResolvedValueOnce({
        stdout: "",
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          RouteAll: true,
          CorpDNS: true,
        }),
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: "{}",
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: "{}",
        stderr: "",
      });

    const client = new CliTailscaleClient("tailscale", runExecFileMock);
    const state = await client.getDashboardState();

    expect(runExecFileMock).toHaveBeenNthCalledWith(1, "tailscale", ["status", "--json"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(2, "tailscale", ["exit-node", "list"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(3, "tailscale", ["debug", "prefs"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(4, "tailscale", ["serve", "status", "--json"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(5, "tailscale", ["funnel", "status", "--json"]);
    expect(state.backendState).toBe("Running");
    expect(state.settings?.acceptDns).toBe(true);
    expect(state.serveStatus?.enabled).toBe(false);
  });

  it("treats no exit nodes found as an empty list", async () => {
    runExecFileMock
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          BackendState: "Running",
          Self: { ID: "self", HostName: "MacBook", Online: true, TailscaleIPs: ["100.64.0.1"] },
          Peer: {},
          Health: [],
        }),
        stderr: "",
      })
      .mockRejectedValueOnce(
        new TailscaleCommandError(
          "no exit nodes found",
          "tailscale",
          ["exit-node", "list"],
          1,
          "",
          "no exit nodes found",
        ),
      )
      .mockResolvedValueOnce({
        stdout: JSON.stringify({
          RouteAll: false,
          CorpDNS: false,
        }),
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: "{}",
        stderr: "",
      })
      .mockResolvedValueOnce({
        stdout: "{}",
        stderr: "",
      });

    const client = new CliTailscaleClient("tailscale", runExecFileMock);
    const state = await client.getDashboardState();

    expect(state.exitNodes).toEqual([]);
  });

  it("uses exact CLI arguments for mutations", async () => {
    runExecFileMock.mockResolvedValue({ stdout: "ok", stderr: "" });
    const client = new CliTailscaleClient("tailscale", runExecFileMock);

    await client.connect();
    await client.disconnect();
    await client.setExitNode("100.64.0.2");
    await client.clearExitNode();
    await client.pingPeer("iphone.tail.example.ts.net");
    await client.runNetcheck();
    await client.setAcceptDns(true);
    await client.setAcceptRoutes(false);
    await client.setSsh(true);
    await client.setWebClient(false);
    await client.setShieldsUp(true);
    await client.setExitNodeLanAccess(false);
    await client.sendFiles("iphone.tail.example.ts.net", ["/tmp/a.txt", "/tmp/b.txt"]);
    await client.receiveFiles("/tmp/downloads", "rename");
    await client.configureServe("localhost:3000", "/");
    await client.resetServe();
    await client.configureFunnel("localhost:3000");
    await client.resetFunnel();

    expect(runExecFileMock).toHaveBeenNthCalledWith(1, "tailscale", ["up"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(2, "tailscale", ["down"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(3, "tailscale", ["set", "--exit-node=100.64.0.2"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(4, "tailscale", ["set", "--exit-node="]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(5, "tailscale", ["ping", "iphone.tail.example.ts.net"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(6, "tailscale", ["netcheck"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(7, "tailscale", ["set", "--accept-dns=true"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(8, "tailscale", ["set", "--accept-routes=false"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(9, "tailscale", ["set", "--ssh=true"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(10, "tailscale", ["set", "--webclient=false"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(11, "tailscale", ["set", "--shields-up=true"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(12, "tailscale", ["set", "--exit-node-allow-lan-access=false"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(13, "tailscale", [
      "file",
      "cp",
      "/tmp/a.txt",
      "/tmp/b.txt",
      "iphone.tail.example.ts.net:",
    ]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(14, "tailscale", [
      "file",
      "get",
      "--conflict=rename",
      "/tmp/downloads",
    ]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(15, "tailscale", [
      "serve",
      "--bg",
      "--yes",
      "--set-path",
      "/",
      "localhost:3000",
    ]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(16, "tailscale", ["serve", "reset"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(17, "tailscale", ["funnel", "--bg", "--yes", "localhost:3000"]);
    expect(runExecFileMock).toHaveBeenNthCalledWith(18, "tailscale", ["funnel", "reset"]);
  });
});
