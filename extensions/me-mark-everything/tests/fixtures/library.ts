import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { handshake, rpc, type Installation } from "../../src/helper";
import type { Store } from "../../src/helpers/submission";

/** Installed discovery supplies only the binary; all config, keys and library paths are fresh. */
export async function isolatedLibrary() {
  const root = mkdtempSync("/private/tmp/me-release-test-");
  try {
    const discovery = process.env.ME_INSTALLED_DISCOVERY;
    const host = process.env.ME_CORE_HOST;
    if (!discovery && !host) throw Error("Set ME_INSTALLED_DISCOVERY or ME_CORE_HOST for isolated integration tests.");
    const executable = discovery ? (JSON.parse(readFileSync(discovery, "utf8")).executable as string) : "/usr/bin/env";
    const args = discovery
      ? []
      : [process.env.ME_TEST_PYTHON ?? join(dirname(host!), "..", ".venv", "bin", "python"), host!];
    const installation: Installation = {
      executable,
      args: [...args, "--stdio", "--config", join(root, "config")],
      protocol: 1,
      extensionId: "a".repeat(32),
    };
    await rpc(installation, "create", { path: join(root, "library"), name: "Isolated release verification" });
    const session = await handshake({ installation, discoveryPath: join(root, "record.json") });
    return { root, session, cleanup: () => rmSync(root, { recursive: true, force: true }) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

export function memoryStore(): Store {
  let raw: string | undefined;
  return {
    getItem: async () => raw,
    setItem: async (_, value) => {
      raw = value;
    },
    removeItem: async () => {
      raw = undefined;
    },
  };
}
