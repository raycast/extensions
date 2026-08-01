import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Apple Silicon and Intel Homebrew prefixes; falls back to whatever is on $PATH.
const CLI_CANDIDATES = ["/opt/homebrew/bin/thock-cli", "/usr/local/bin/thock-cli"];
const MANIFEST_URL = "https://raw.githubusercontent.com/kamillobinski/thock-soundpacks/refs/heads/main/manifest.json";
const SOUNDPACKS_DIR = path.join(os.homedir(), "Library", "Application Support", "Thock", "Soundpacks");

type Soundpack = {
  id: string;
  metadata: {
    name: string;
    brand: string;
    author: string;
  };
};

type Manifest = {
  soundpacks: Record<string, Soundpack[]>;
};

function isInstalled(id: string): boolean {
  return fs.existsSync(path.join(SOUNDPACKS_DIR, id, "config.json"));
}

/**
 * Runs thock-cli with the given arguments.
 *
 * Uses `execFile` rather than `exec` so no shell is involved: the soundpack ids come from
 * a remote manifest, and must never be able to reach a shell as syntax.
 */
async function runThockCli(args: string[]) {
  const cliPath = CLI_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ?? "thock-cli";
  await execFileAsync(cliPath, args, {
    env: { ...process.env, PATH: [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin"].filter(Boolean).join(":") },
  });
}

async function preview(soundpack: Soundpack) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Previewing ${soundpack.metadata.name}`,
  });

  try {
    // Plays a few keystrokes from the pack without installing it.
    await runThockCli(["preview", soundpack.id]);
    toast.style = Toast.Style.Success;
    toast.title = `Previewed ${soundpack.metadata.name}`;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Preview failed";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

async function setSoundpack(soundpack: Soundpack) {
  try {
    await runThockCli(["set-soundpack", soundpack.id]);
    await showToast({ style: Toast.Style.Success, title: `Selected ${soundpack.metadata.name}` });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not select soundpack",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export default function Command() {
  const { data, isLoading } = useFetch<Manifest>(MANIFEST_URL, {
    failureToastOptions: { title: "Could not load the soundpack registry" },
  });

  const categories = Object.entries(data?.soundpacks ?? {});

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search soundpacks">
      {categories.map(([category, soundpacks]) => (
        <List.Section key={category} title={category.charAt(0).toUpperCase() + category.slice(1)}>
          {soundpacks.map((soundpack) => {
            const installed = isInstalled(soundpack.id);
            return (
              <List.Item
                key={soundpack.id}
                title={soundpack.metadata.name}
                subtitle={`${soundpack.metadata.brand} · ${soundpack.metadata.author}`}
                keywords={[soundpack.metadata.brand, soundpack.metadata.author]}
                accessories={installed ? [{ tag: { value: "Installed", color: Color.Green } }] : []}
                actions={
                  <ActionPanel>
                    <Action title="Preview" icon={Icon.SpeakerOn} onAction={() => preview(soundpack)} />
                    {installed && (
                      <Action title="Set as Active" icon={Icon.Keyboard} onAction={() => setSoundpack(soundpack)} />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
