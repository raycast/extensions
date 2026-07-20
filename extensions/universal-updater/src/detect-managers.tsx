import {
  Action,
  ActionPanel,
  Detail,
  Grid,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { EcosystemId, isEcosystemAvailable, run } from "./ecosystems";

function getEmojiIcon(emoji: string) {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="70">${emoji}</text></svg>`;
}

type ManagerInfo = {
  id: EcosystemId;
  name: string;
  website: string;
  installed?: boolean;
  installCommand: string;
  description: string;
  emoji: string;
};

const MANAGERS: ManagerInfo[] = [
  {
    id: "brew",
    name: "Homebrew",
    website: "https://brew.sh",
    description: "The missing package manager for macOS",
    installCommand:
      '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
    emoji: "🍺",
  },
  {
    id: "npm",
    name: "npm",
    website: "https://npmjs.com",
    description: "JavaScript package manager",
    installCommand: "brew install node",
    emoji: "📦",
  },
  {
    id: "yarn",
    name: "yarn",
    website: "https://yarnpkg.com",
    description: "Fast, reliable, and secure JavaScript package manager",
    installCommand: "brew install yarn",
    emoji: "🧶",
  },
  {
    id: "pnpm",
    name: "pnpm",
    website: "https://pnpm.io",
    description: "Fast, disk space efficient package manager",
    installCommand: "npm install -g pnpm",
    emoji: "⚡",
  },
  {
    id: "bun",
    name: "bun",
    website: "https://bun.sh",
    description:
      "Incredibly fast JavaScript runtime, bundler, test runner, and package manager",
    installCommand: "curl -fsSL https://bun.sh/install | bash",
    emoji: "🥟",
  },
  {
    id: "deno",
    name: "deno",
    website: "https://deno.land",
    description: "A modern runtime for JavaScript and TypeScript",
    installCommand: "curl -fsSL https://deno.land/x/install/install.sh | sh",
    emoji: "🦕",
  },
  {
    id: "composer",
    name: "composer",
    website: "https://getcomposer.org",
    description: "Dependency Manager for PHP",
    installCommand: "brew install composer",
    emoji: "🐘",
  },
  {
    id: "pip",
    name: "pip",
    website: "https://pip.pypa.io",
    description: "Python package installer",
    installCommand: "brew install python3",
    emoji: "🐍",
  },
  {
    id: "pipx",
    name: "pipx",
    website: "https://pipx.pypa.io",
    description: "Install and run Python applications in isolated environments",
    installCommand: "brew install pipx",
    emoji: "🎁",
  },
  {
    id: "cargo",
    name: "cargo",
    website: "https://doc.rust-lang.org/cargo",
    description: "Rust package manager",
    installCommand: "brew install rust",
    emoji: "🦀",
  },
  {
    id: "gem",
    name: "gem",
    website: "https://rubygems.org",
    description: "Ruby package manager",
    installCommand: "brew install ruby",
    emoji: "💎",
  },
  {
    id: "mas",
    name: "mas",
    website: "https://github.com/mas-cli/mas",
    description: "Mac App Store command line interface",
    installCommand: "brew install mas",
    emoji: "🍏",
  },
  {
    id: "go",
    name: "go",
    website: "https://golang.org",
    description: "Go programming language and tools",
    installCommand: "brew install go",
    emoji: "🐹",
  },
  {
    id: "fnm" as EcosystemId,
    name: "FNM",
    website: "https://github.com/Schniz/fnm",
    description: "Fast and simple Node.js version manager, built in Rust.",
    installCommand: "brew install fnm",
    emoji: "🚀",
  },
  {
    id: "java" as EcosystemId,
    name: "Azul Zulu JDK",
    website: "https://www.azul.com/downloads/",
    description:
      "OpenJDK builds by Azul Systems, highly popular for enterprise Java.",
    installCommand: "brew install --cask zulu",
    emoji: "☕",
  },
];

async function detectManagers(): Promise<ManagerInfo[]> {
  return Promise.all(
    MANAGERS.map(async (m) => {
      let installed = false;
      if (m.id === ("fnm" as EcosystemId)) {
        try {
          await run("command -v fnm");
          installed = true;
        } catch {
          installed = false;
        }
      } else if (m.id === ("java" as EcosystemId)) {
        try {
          await run("command -v java");
          installed = true;
        } catch {
          installed = false;
        }
      } else {
        installed = await isEcosystemAvailable(m.id);
      }
      return {
        ...m,
        installed,
      };
    }),
  );
}

function ManagerDetailView(props: {
  manager: ManagerInfo;
  onBack: () => void;
  onInstall: (manager: ManagerInfo) => void;
}) {
  const { manager, onBack, onInstall } = props;

  const markdown = `# ${manager.emoji} ${manager.name}

${manager.description}

## Website
[Open Website](${manager.website})

## Installation

To install ${manager.name}, run the following command in your terminal:

\`\`\`bash
${manager.installCommand}
\`\`\`

${
  manager.id === "brew"
    ? "\n⚠️ **Homebrew is essential** — most other tools can be installed via Homebrew. Install it first if you haven't already."
    : `\n💡 **Tip:** If you don't have Homebrew installed yet, Homebrew is the easiest way to install most tools on macOS.`
}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {!manager.installed && (
            <Action
              title={`Install ${manager.name}`}
              icon={Icon.Download}
              onAction={() => onInstall(manager)}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={manager.installCommand}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.OpenInBrowser title="Open Website" url={manager.website} />
          <Action
            title="Go Back"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
            onAction={onBack}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [managers, setManagers] = useState<ManagerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<EcosystemId | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const detected = await detectManagers();
    setManagers(detected);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, []);

  const handleInstall = async (manager: ManagerInfo) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing ${manager.name}…`,
      message: `Running command: ${manager.installCommand}`,
    });

    try {
      await run(manager.installCommand);
      toast.style = Toast.Style.Success;
      toast.title = `✅ ${manager.name} Installed!`;
      toast.message = "Refreshing manager list…";
      await refresh();
    } catch (err: any) {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed to install ${manager.name}`;
      toast.message = err?.message ?? String(err);
    }
  };

  const installed = managers.filter((m) => m.installed);
  const notInstalled = managers.filter((m) => !m.installed);

  if (selectedId) {
    const selected = managers.find((m) => m.id === selectedId);
    if (selected) {
      return (
        <ManagerDetailView
          manager={selected}
          onBack={() => setSelectedId(null)}
          onInstall={handleInstall}
        />
      );
    }
  }

  return (
    <Grid
      isLoading={isLoading}
      navigationTitle="Detected Managers"
      searchBarPlaceholder="Search managers…"
      itemSize={Grid.ItemSize.Medium}
    >
      <Grid.Section
        title={`Installed Managers (${installed.length}/${managers.length})`}
        subtitle="Installed and ready to use"
      >
        {installed.length === 0 ? (
          <Grid.Item
            content={getEmojiIcon("⚠️")}
            title="No managers detected"
            subtitle="Install one or more to get started"
          />
        ) : (
          installed.map((m) => (
            <Grid.Item
              key={m.id}
              content={getEmojiIcon(m.emoji)}
              title={m.name}
              subtitle="✅ Installed"
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() => setSelectedId(m.id)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void refresh()}
                  />
                  <Action.OpenInBrowser title="Open Website" url={m.website} />
                </ActionPanel>
              }
            />
          ))
        )}
      </Grid.Section>

      {notInstalled.length > 0 && (
        <Grid.Section
          title={`Not Installed (${notInstalled.length})`}
          subtitle="Open a card to view installation instructions"
        >
          {notInstalled.map((m) => (
            <Grid.Item
              key={m.id}
              content={getEmojiIcon(m.emoji)}
              title={m.name}
              subtitle="Not installed"
              actions={
                <ActionPanel>
                  <Action
                    title="Install Manager"
                    icon={Icon.Download}
                    onAction={() => void handleInstall(m)}
                  />
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() => setSelectedId(m.id)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Install Command"
                    content={m.installCommand}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser title="Open Website" url={m.website} />
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => void refresh()}
                  />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}
