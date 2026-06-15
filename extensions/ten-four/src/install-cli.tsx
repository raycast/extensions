import {
  Detail,
  ActionPanel,
  Action,
  showToast,
  Toast,
  environment,
  Icon,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { homedir } from "os";
import { join } from "path";
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  chmodSync,
  accessSync,
  constants,
} from "fs";

const SOURCE = join(environment.assetsPath, "tenfour");

// Candidate bin dirs, in order of preference. The first two are effectively
// always on a developer's PATH; ~/.local/bin is the create-and-warn fallback.
const CANDIDATES = [
  "/opt/homebrew/bin",
  "/usr/local/bin",
  join(homedir(), ".local", "bin"),
];

function isWritable(dir: string): boolean {
  try {
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function pickBinDir(): {
  dir: string;
  assumedOnPath: boolean;
  mustCreate: boolean;
} {
  for (const dir of CANDIDATES.slice(0, 2)) {
    if (existsSync(dir) && isWritable(dir)) {
      return { dir, assumedOnPath: true, mustCreate: false };
    }
  }
  const fallback = CANDIDATES[2];
  const onPath = (process.env.PATH || "").split(":").includes(fallback);
  return {
    dir: fallback,
    assumedOnPath: onPath,
    mustCreate: !existsSync(fallback),
  };
}

function findInstalled(): string | null {
  for (const dir of CANDIDATES) {
    const p = join(dir, "tenfour");
    if (existsSync(p)) return p;
  }
  return null;
}

export default function Command() {
  const [installedAt, setInstalledAt] = useState<string | null>(null);
  const target = pickBinDir();
  const dest = join(target.dir, "tenfour");

  useEffect(() => {
    setInstalledAt(findInstalled());
  }, []);

  async function install() {
    try {
      if (target.mustCreate) mkdirSync(target.dir, { recursive: true });
      copyFileSync(SOURCE, dest);
      chmodSync(dest, 0o755);
      setInstalledAt(dest);
      await showToast({
        style: Toast.Style.Success,
        title: "Installed tenfour",
        message: dest,
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Install failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const onPathNote = target.assumedOnPath
    ? ""
    : `\n\n> ⚠️ \`${target.dir}\` may not be on your \`PATH\`. After installing, add this to your shell profile:\n>\n> \`\`\`sh\n> export PATH="${target.dir}:$PATH"\n> \`\`\``;

  const statusBlock = installedAt
    ? `✅ **Installed** at \`${installedAt}\``
    : `⬜️ **Not installed yet**`;

  const markdown = `# Ten Four CLI

Installs the \`tenfour\` command so your terminal (and tools like **Claude Code**) can push snippets onto your shelf:

\`\`\`sh
tenfour --label "Railway URL" "https://my-app.up.railway.app"
echo "$(pbpaste)" | tenfour -l "from clipboard" -
\`\`\`

${statusBlock}

It will be installed to:

\`\`\`
${dest}
\`\`\`
${onPathNote}

---

**For Claude Code users:** add this to your \`CLAUDE.md\` so Claude pushes copyable
snippets automatically:

\`\`\`md
When you output a snippet I'm likely to want to copy (a URL, token, command,
path, or code block), also run:
  tenfour --label "<short label>" "<the exact text>"
so it lands on my Ten Four shelf with clean formatting.
\`\`\`
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title={installedAt ? "Reinstall CLI" : "Install CLI"}
            icon={Icon.Download}
            onAction={install}
          />
          <Action
            title="Reveal in Finder"
            icon={Icon.Finder}
            onAction={() => open(target.dir)}
          />
        </ActionPanel>
      }
    />
  );
}
