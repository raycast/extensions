import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import {
  access,
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
} from "node:fs/promises";
import { join } from "node:path";

export async function preparePlayer() {
  const binary = join(environment.assetsPath, "SpeakPlayer");
  const plist = join(environment.assetsPath, "PlayerInfo.plist");
  const installer = join(environment.assetsPath, "install-voice.sh");
  const digest = createHash("sha256")
    .update(await readFile(binary))
    .update(await readFile(plist))
    .update(await readFile(installer))
    .digest("hex")
    .slice(0, 16);
  const root = join(environment.supportPath, digest);
  const app = join(root, "Speak Text.app");
  await mkdir(root, { recursive: true });
  if (
    await access(app).then(
      () => true,
      () => false,
    )
  )
    return app;
  const stage = await mkdtemp(join(root, "install-"));
  try {
    const macos = join(stage, "Contents", "MacOS");
    await mkdir(macos, { recursive: true });
    const resources = join(stage, "Contents", "Resources");
    await mkdir(resources);
    await copyFile(installer, join(resources, "install-voice.sh"));
    await copyFile(plist, join(stage, "Contents", "Info.plist"));
    await copyFile(binary, join(macos, "SpeakPlayer"));
    await chmod(join(macos, "SpeakPlayer"), 0o755);
    try {
      await rename(stage, app);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOTEMPTY") throw error;
    }
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
  return app;
}
