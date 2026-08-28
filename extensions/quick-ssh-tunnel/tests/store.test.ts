import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";

const realHome = os.homedir;
let root = "";

function freshStore() {
  delete require.cache[require.resolve("../src/lib/store")];
  return require("../src/lib/store") as typeof import("../src/lib/store");
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "quick-ssh-tunnel-"));
  os.homedir = () => root;
});

afterEach(() => {
  os.homedir = realHome;
  fs.rmSync(root, { recursive: true, force: true });
});

describe("connection history", () => {
  test("keeps newest connection first and caps history at 50", () => {
    const store = freshStore();
    for (let i = 0; i < 51; i += 1) {
      store.saveConnection({
        id: String(i),
        mode: "forward",
        sshTarget: `user@host-${i}`,
        port: 1000 + i,
        remoteHost: "127.0.0.1",
        compression: true,
        lastUsedAt: i,
      });
    }

    const connections = store.loadConnections();
    expect(connections).toHaveLength(50);
    expect(connections[0].id).toBe("50");
    expect(connections.at(-1).id).toBe("1");
  });

  test("clones a connection with a new ID and no history write", () => {
    const store = freshStore();
    const original = {
      id: "original",
      mode: "socks5" as const,
      sshTarget: "dev@example.com",
      port: 1080,
      remoteHost: "127.0.0.1",
      compression: true,
      lastUsedAt: 10,
    };

    const clone = store.cloneConnection(original);

    expect(clone).toMatchObject({
      ...original,
      id: expect.any(String),
      lastUsedAt: expect.any(Number),
    });
    expect(clone.id).not.toBe(original.id);
    expect(store.loadConnections()).toEqual([]);
  });
});
