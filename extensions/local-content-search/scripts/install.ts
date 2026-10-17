import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdir, copyFile, chmod, writeFile } from "node:fs/promises";
import { homedir, arch } from "node:os";
import { join, resolve } from "node:path";
import { paths } from "../service/paths";
import { LocalClient } from "../service/client";
import { AGENT_LABEL, launchAgent } from "./agent";

// Explicit installation copies standalone artifacts; it never chooses indexing folders.
const exec = promisify(execFile);
const SERVICE_WAIT_MS = 10000;
async function main(): Promise<void> {
  if (process.platform !== "darwin" || arch() !== "arm64") {
    throw new Error("Requires an Apple Silicon Mac");
  }
  const root = resolve(__dirname, "..");
  const engine = join(root, "native/.build/release/local-search-engine");
  const daemon = join(root, "dist/service.cjs");
  await Promise.all([access(engine), access(daemon)]);
  const locations = paths();
  for (const directory of [
    locations.base,
    join(locations.base, "bin"),
    locations.logs,
    locations.models,
  ]) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
  }
  const domain = `gui/${process.getuid!()}`;
  // Stop only our previously installed agent before replacing its binaries.
  await exec("/bin/launchctl", ["bootout", `${domain}/${AGENT_LABEL}`]).catch(
    () => {},
  );
  await copyFile(engine, locations.engine);
  await chmod(locations.engine, 0o755);
  await copyFile(daemon, locations.daemon);
  await chmod(locations.daemon, 0o600);

  // Installed binaries retain upstream copyright and model-license notices.
  const licenses = join(locations.base, "licenses");
  await mkdir(licenses, { recursive: true, mode: 0o700 });
  for (const file of [
    "LICENSE-DigUp",
    "LICENSE-llama.cpp",
    "LICENSE-EmbeddingGemma2",
  ]) {
    await copyFile(join(root, "native", file), join(licenses, file));
  }
  await copyFile(
    join(root, "THIRD_PARTY_NOTICES.md"),
    join(licenses, "THIRD_PARTY_NOTICES.md"),
  );

  const agents = join(homedir(), "Library/LaunchAgents");
  await mkdir(agents, { recursive: true });
  const plist = join(agents, `${AGENT_LABEL}.plist`);
  await writeFile(plist, launchAgent(process.execPath, locations), {
    mode: 0o600,
  });
  await exec("/usr/bin/plutil", ["-lint", plist]);
  await exec("/bin/launchctl", ["bootstrap", domain, plist]);
  const client = new LocalClient(locations.socket);
  const deadline = Date.now() + SERVICE_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const status = await client.status();
      console.log(
        `Service installed and ready. Selected folders: ${status.config.roots.length}. Model ready: ${status.modelReady}.`,
      );
      return;
    } catch {
      await new Promise((done) => {
        setTimeout(done, 200);
      });
    }
  }
  throw new Error(`Service did not become ready; inspect ${locations.logs}`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
