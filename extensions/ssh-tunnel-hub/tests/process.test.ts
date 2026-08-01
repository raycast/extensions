import { describe, expect, test } from "bun:test";
import { buildArgs } from "../src/lib/process";
import type { Tunnel } from "../src/lib/store";

const baseTunnel: Tunnel = {
  id: "test-tunnel",
  name: "Test Tunnel",
  localPort: 5433,
  remoteHost: "localhost",
  remotePort: 5432,
  sshTarget: "user@example.com",
};

describe("buildArgs", () => {
  test("adds SSH compression flag when tunnel compression is enabled", () => {
    const args = buildArgs({ ...baseTunnel, compression: true });

    expect(args).toContain("-C");
    expect(args.indexOf("-C")).toBeLessThan(args.indexOf("-N"));
  });

  test("omits SSH compression flag by default", () => {
    const args = buildArgs(baseTunnel);

    expect(args).not.toContain("-C");
  });
});
