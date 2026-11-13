import net from "node:net";
import { describe, expect, it } from "vitest";
import { isPrivateIPv4, openPortCandidates, subnetCandidates } from "../src/discovery/network";

describe("network discovery", () => {
  it("recognizes private networks without treating CGNAT as LAN by default", () => {
    expect(isPrivateIPv4("192.168.0.24")).toBe(true);
    expect(isPrivateIPv4("172.16.2.3")).toBe(true);
    expect(isPrivateIPv4("10.0.0.2")).toBe(true);
    expect(isPrivateIPv4("100.116.182.31")).toBe(false);
    expect(isPrivateIPv4("100.116.182.31", true)).toBe(true);
    expect(isPrivateIPv4("192.168.999.1")).toBe(false);
  });

  it("scans the local /24 without probing its own address", () => {
    const candidates = subnetCandidates([{ interfaceName: "en0", address: "192.168.0.24" }]);
    expect(candidates).toHaveLength(253);
    expect(candidates).toContain("192.168.0.100");
    expect(candidates).not.toContain("192.168.0.24");
    expect(candidates).not.toContain("192.168.0.0");
    expect(candidates).not.toContain("192.168.0.255");
  });

  it("honors a bounded wider subnet", () => {
    const candidates = subnetCandidates([
      { interfaceName: "en0", address: "192.168.1.24", netmask: "255.255.254.0" },
    ]);
    expect(candidates).toHaveLength(509);
    expect(candidates).toContain("192.168.0.100");
    expect(candidates).toContain("192.168.1.254");
    expect(candidates).not.toContain("192.168.1.24");
  });

  it("supports active discovery across a /16", () => {
    const candidates = subnetCandidates([{ interfaceName: "en0", address: "10.20.30.40", netmask: "255.255.0.0" }]);
    expect(candidates).toHaveLength(65_533);
    expect(candidates).toContain("10.20.1.115");
    expect(candidates).toContain("10.20.254.200");
    expect(candidates).not.toContain("10.20.30.40");
  });

  it("keeps only hosts accepting BOOXDrop TCP connections", async () => {
    const server = net.createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Test server did not expose a TCP port");
      await expect(openPortCandidates(["127.0.0.1", "127.0.0.2"], address.port, 50, 2)).resolves.toEqual([
        "127.0.0.1",
      ]);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
