#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { docusaurusHeadingId, pinnedRawDocumentUrl, sliceRequiredSection, slugify } from "./sync-utils.mjs";

const REPOSITORY = "https://github.com/NousResearch/hermes-agent";
const DOCS_BASE = "https://hermes-agent.nousresearch.com/docs";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, "..");
const OUTPUT_PATH = path.join(PROJECT_DIR, "src/data/generated.json");

const argv = process.argv.slice(2);
const sourceIndex = argv.indexOf("--source");
if (sourceIndex >= 0 && !argv[sourceIndex + 1]) throw new Error("--source requires a Hermes Agent checkout path");
const sourceRoot = sourceIndex >= 0 ? path.resolve(argv[sourceIndex + 1]) : undefined;

const docs = {
  cli: {
    local: "website/docs/reference/cli-commands.md",
    remote: "website/docs/reference/cli-commands.md",
  },
  slash: {
    local: "website/docs/reference/slash-commands.md",
    remote: "website/docs/reference/slash-commands.md",
  },
  profile: {
    local: "website/docs/reference/profile-commands.md",
    remote: "website/docs/reference/profile-commands.md",
  },
};

async function loadDocument(document, commit) {
  if (sourceRoot) return readFile(path.join(sourceRoot, document.local), "utf8");

  const documentUrl = pinnedRawDocumentUrl(commit, document.remote);
  const response = await fetch(documentUrl, {
    headers: { "User-Agent": "hermes-agent-cheatsheet-sync" },
  });
  if (!response.ok) throw new Error(`Failed to fetch ${documentUrl}: HTTP ${response.status}`);
  return response.text();
}

async function getSourceCommit() {
  if (sourceRoot) {
    const localDocumentPaths = Object.values(docs).map((document) => document.local);
    const changedDocuments = execFileSync("git", ["status", "--porcelain", "--", ...localDocumentPaths], {
      cwd: sourceRoot,
      encoding: "utf8",
    }).trim();
    if (changedDocuments) {
      throw new Error(`Cannot record an exact source commit while source documents have local changes:\n${changedDocuments}`);
    }
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: sourceRoot,
      encoding: "utf8",
    }).trim();
  }

  const response = await fetch("https://api.github.com/repos/NousResearch/hermes-agent/commits/main", {
    headers: { "User-Agent": "hermes-agent-cheatsheet-sync" },
  });
  if (!response.ok) throw new Error(`Failed to resolve the Hermes Agent source commit: HTTP ${response.status}`);
  const payload = await response.json();
  if (!/^[a-f0-9]{40}$/.test(payload.sha ?? "")) throw new Error("GitHub returned an invalid Hermes Agent commit");
  return payload.sha;
}

function cleanMarkdown(value) {
  return value
    .replace(/\\\|/g, "|")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTableRow(line) {
  const escapedPipe = "\u0000";
  return line
    .replace(/\\\|/g, escapedPipe)
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((cell) => cell.replaceAll(escapedPipe, "|").trim());
}

function codeSpans(value) {
  return [...value.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

function normalizeExamples(usage, example, examples = []) {
  const candidates = [...(example ? [{ title: "Example", command: example }] : []), ...examples].filter(
    (candidate) => candidate.command && candidate.command !== usage,
  );
  const seen = new Set();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.command)) return false;
    seen.add(candidate.command);
    return true;
  });
}

function examplesFromDescription(descriptionCell, command) {
  return codeSpans(descriptionCell)
    .filter((value) => /^(?:\/|hermes\s)/.test(value))
    .filter((value) => !/[<[\]|]/.test(value))
    .filter((value) => value.split(/\s+/)[0] === command)
    .map((command, index) => ({
      title: `Example ${index + 1}`,
      command,
    }));
}

function curatedSlashExamples(usage) {
  const command = usage.split(/\s+/)[0];

  if (command === "/model") {
    return [
      {
        title: "Session-Only Switch",
        command: "/model gpt-5.6-sol --provider openai-codex --session",
        description:
          "Example only: replace the model and provider with your own values and keep the change session-scoped.",
      },
      {
        title: "Switch and Save Globally",
        command: "/model gpt-5.6-sol --provider openai-codex --global",
        description:
          "Example only: replace the model and provider with your own values, then persist them in config.yaml.",
      },
      {
        title: "One-Turn Switch",
        command: "/model gpt-5.6-sol --provider openai-codex --once",
        description:
          "Example only: replace the model and provider with your own values, use them once, then restore the previous model.",
      },
      {
        title: "Refresh Available Models",
        command: "/model --refresh",
        description: "Refresh provider model catalogs before choosing a model.",
      },
    ];
  }

  if (command === "/new") {
    return [
      { title: "Named Session", command: "/new my-experiment" },
      { title: "Skip Confirmation", command: "/new --yes my-experiment" },
    ];
  }

  if (command === "/fast") {
    return [
      { title: "Enable Fast Mode", command: "/fast fast" },
      { title: "Enable and Save Globally", command: "/fast fast --global" },
      { title: "Return to Normal", command: "/fast normal" },
      { title: "Check Status", command: "/fast status" },
    ];
  }

  if (command === "/compress") {
    return [
      { title: "Keep Recent Exchanges", command: "/compress here 4" },
      { title: "Focus the Summary", command: "/compress focus deployment decisions" },
    ];
  }

  return [];
}

function categoryForCliCommand(command) {
  const family = command.replace(/^hermes\s+/, "").split(/\s+/)[0];

  if (["setup", "update"].includes(family)) return "getting-started";
  if (["model", "moa", "fallback", "auth", "login", "logout", "portal", "proxy"].includes(family)) return "models";
  if (["gateway", "whatsapp", "whatsapp-cloud", "slack", "send", "pairing"].includes(family)) return "gateway";
  if (["cron", "kanban", "project", "webhook"].includes(family)) return "automation";
  if (["tools", "computer-use", "lsp"].includes(family)) return "tools";
  if (["skills", "bundles", "curator", "memory", "pets", "journey"].includes(family)) return "skills-memory";
  if (["mcp", "acp"].includes(family)) return "mcp";
  if (
    [
      "secrets",
      "migrate",
      "status",
      "security",
      "doctor",
      "dump",
      "debug",
      "backup",
      "checkpoints",
      "import",
      "logs",
      "prompt-size",
      "config",
      "hooks",
      "profile",
      "completion",
      "version",
      "uninstall",
      "egress",
      "approvals",
      "import-agent",
      "skin",
    ].includes(family)
  ) {
    return "configuration";
  }

  return "cli";
}

function createItem({
  category,
  name,
  description,
  usage = name,
  example,
  examples,
  tags = [],
  documentationUrl,
  aliases,
  warning,
  platforms,
  statuses = [],
  details,
  idKey = usage,
}) {
  const normalizedExamples = normalizeExamples(usage, example, examples);
  const inferredStatuses = [...statuses];
  const behaviorText = `${usage} ${description}`.toLowerCase();
  const normalizedUsage = usage.toLowerCase();
  const normalizedDescription = description.toLowerCase();

  if (
    warning ||
    /(?:^|\s)(remove|uninstall|revoke|delete|unset)(?:\s|$)/.test(normalizedUsage) ||
    normalizedUsage === "/undo"
  ) {
    inferredStatuses.push("CAUTION");
  }
  if (normalizedDescription.startsWith("deprecated") || normalizedDescription.includes("has been removed")) {
    inferredStatuses.push("DEPRECATED");
  }
  if (
    usage.includes("--global") ||
    /\b(?:persist|persists|persisted|sticky default|permanent allowlist)\b/.test(behaviorText) ||
    /\bpersistent\b[^.!?]{0,80}\b(?:mode|setting|configuration|state|default|allowlist)\b/.test(behaviorText) ||
    /\bwrites?\b[^.!?]{0,80}\b(?:config(?:uration)?|file|agents\.md|disk)\b/.test(behaviorText)
  ) {
    inferredStatuses.push("PERSISTS");
  }
  if (/\brestart\b|effective on next session|takes effect on next restart/.test(behaviorText)) {
    inferredStatuses.push("RESTART");
  }
  if (/\bcurrent session only\b|session-only/.test(behaviorText)) inferredStatuses.push("SESSION");
  if (normalizedUsage.startsWith("/codex-runtime")) inferredStatuses.push("PERSISTS");

  return {
    id: `command-${slugify(idKey)}`,
    name,
    description,
    usage,
    ...(normalizedExamples.length ? { examples: normalizedExamples } : {}),
    category,
    tags: [...new Set(tags)],
    documentationUrl,
    ...(aliases?.length ? { aliases: [...new Set(aliases)] } : {}),
    ...(warning ? { warning } : {}),
    ...(platforms?.length ? { platforms } : {}),
    ...(inferredStatuses.length ? { statuses: [...new Set(inferredStatuses)] } : {}),
    ...(details ? { details } : {}),
  };
}

function parseTopLevelCommands(markdown) {
  const section = sliceRequiredSection(markdown, "## Top-level commands", "## `hermes chat`");

  return section
    .split("\n")
    .filter((line) => line.trim().startsWith("| `"))
    .map((line) => {
      const [commandCell, descriptionCell] = splitTableRow(line);
      const commands = codeSpans(commandCell);
      const usage = commands[0];
      const category = categoryForCliCommand(usage);

      return createItem({
        category,
        name: cleanMarkdown(commandCell),
        description: cleanMarkdown(descriptionCell),
        usage,
        aliases: commands.slice(1),
        tags: ["cli", "terminal", usage.split(/\s+/)[1] ?? "hermes"],
        documentationUrl: `${DOCS_BASE}/reference/cli-commands`,
        platforms: ["Terminal"],
      });
    });
}

function parseSlashCommands(markdown) {
  const lines = sliceRequiredSection(
    markdown,
    "## Interactive CLI slash commands",
    "### Quick Commands",
  ).split("\n");
  const messagingSection = sliceRequiredSection(markdown, "## Messaging slash commands", "## Notes");
  const messagingCommands = new Set(
    messagingSection
      .split("\n")
      .filter((line) => line.trim().startsWith("| `"))
      .flatMap((line) => codeSpans(splitTableRow(line)[0]))
      .map((usage) => usage.split(/\s+/)[0]),
  );
  const allowedGroups = new Set(["Session", "Configuration", "Tools & Skills", "Info", "Exit"]);
  const items = [];
  let group = "";

  for (const line of lines) {
    if (line.startsWith("### ")) {
      group = cleanMarkdown(line.slice(4));
      continue;
    }
    if (!allowedGroups.has(group) || !line.trim().startsWith("| `")) continue;

    const [commandCell, descriptionCell] = splitTableRow(line);
    const commands = codeSpans(commandCell);
    if (!commands.length) continue;

    const documentedUsage = commands[0];
    const command = documentedUsage.split(/\s+/)[0];
    const usage = command === "/fast" ? `${documentedUsage} [--global]` : documentedUsage;
    const curatedExamples = curatedSlashExamples(usage);
    const description =
      command === "/model"
        ? "Show or change the current model. Use --provider to switch to an already configured provider, --global to save the default, --session to keep the change session-only, --once for one turn, or --refresh to reload model catalogs. Add providers with hermes model before starting a session. Switching models mid-conversation resets the prompt cache."
        : command === "/fast"
          ? "Toggle fast mode between normal and fast service tiers. Changes are session-scoped by default; use --global to save the selected tier to config."
        : cleanMarkdown(descriptionCell);
    const warning =
      command === "/model"
        ? "Switching models mid-conversation resets the prompt cache. The next turn re-reads the conversation at full input price."
        : undefined;
    items.push(
      createItem({
        category: "slash",
        name: command === "/fast" ? usage : cleanMarkdown(commandCell),
        description,
        usage,
        examples: curatedExamples.length ? curatedExamples : examplesFromDescription(descriptionCell, command),
        aliases: commands.slice(1),
        tags: ["slash command", group.toLowerCase(), ...commands.map((command) => command.replace(/^\//, ""))],
        documentationUrl: `${DOCS_BASE}/reference/slash-commands#${docusaurusHeadingId(group)}`,
        platforms: messagingCommands.has(command) ? ["Interactive CLI", "Messaging"] : ["Interactive CLI"],
        warning,
        statuses: command === "/model" ? ["SESSION"] : command === "/focus" ? ["PERSISTS"] : [],
        idKey: command,
      }),
    );
  }

  const itemByUsage = new Map();
  for (const item of items) {
    const existing = itemByUsage.get(item.usage);
    if (!existing || item.description.length > existing.description.length) itemByUsage.set(item.usage, item);
  }
  return [...itemByUsage.values()];
}

function commandHeadingSections(markdown) {
  const matches = [...markdown.matchAll(/^(#{2,3}) (`[^`]+`.*)$/gm)];

  return matches.map((match) => {
    const level = match[1].length;
    const contentStart = match.index + match[0].length;
    const tail = markdown.slice(contentStart);
    const nextHeading = new RegExp(`^#{2,${level}}\\s`, "m").exec(tail);

    return {
      heading: cleanMarkdown(match[2]),
      content: tail.slice(0, nextHeading?.index ?? tail.length),
    };
  });
}

function firstCommandBlock(section) {
  const fence = section.match(/```(?:bash)?\s*\n([\s\S]*?)```/);
  if (!fence) return [];

  return fence[1]
    .split("\n")
    .map((line) => line.trim().replace(/^\$\s*/, ""))
    .filter((line) => line.startsWith("hermes "));
}

function firstProseParagraph(section) {
  const withoutFirstFence = section.replace(/```(?:bash)?\s*\n[\s\S]*?```/, "");

  return withoutFirstFence
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !/^(?:\||#{2,3}\s|:::|Argument\b|Option\b|Subcommand\b)/.test(paragraph))
    .map(cleanMarkdown)
    .find(Boolean);
}

function parametersFromSection(section) {
  const seen = new Set();
  const parameters = [];

  for (const line of section.split("\n")) {
    if (!line.trim().startsWith("| `")) continue;
    const [nameCell, descriptionCell] = splitTableRow(line);
    if (!nameCell || !descriptionCell) continue;
    const name = cleanMarkdown(nameCell);
    if (seen.has(name)) continue;
    seen.add(name);
    parameters.push({ name, description: cleanMarkdown(descriptionCell) });
  }

  return parameters;
}

function curatedProfileContent(usage) {
  if (usage.startsWith("hermes profile create ")) {
    return {
      examples: [
        {
          title: "Blank Profile",
          command: "hermes profile create work",
          description: "Create an isolated profile that still needs model and credential setup.",
        },
        {
          title: "Clone Current Configuration",
          command: "hermes profile create work --clone",
          description: "Copy config, credentials, SOUL.md, and skills while starting with fresh sessions and memory.",
        },
        {
          title: "Clone a Specific Profile",
          command: "hermes profile create work --clone-from coder",
          description: "Use coder as the source instead of the active profile.",
        },
      ],
      details: {
        whenToUse:
          "Create a separate Hermes agent for a role, project, identity, credential set, or messaging gateway without mixing its state with another profile.",
        prerequisites: ["Choose a unique profile name made from letters, numbers, hyphens, or underscores."],
        workflow: [
          {
            title: "1. Create the profile",
            command: "hermes profile create work --clone",
            description: "Clone the current setup or omit --clone to start blank.",
          },
          {
            title: "2. Configure models and tools",
            command: "hermes -p work setup --portal",
            description: "Run setup explicitly inside the new profile.",
          },
          {
            title: "3. Set its project directory",
            command: "hermes -p work config set terminal.cwd /absolute/path/to/project",
            description: "Profiles isolate state; terminal.cwd separately controls where shell commands begin.",
          },
          {
            title: "4. Validate the profile",
            command: "hermes -p work doctor",
            description: "Check credentials, providers, dependencies, and runtime configuration.",
          },
          {
            title: "5. Start using it",
            command: "hermes -p work chat",
            description: "Use -p for an explicit one-command selection or run work chat through its generated alias.",
          },
        ],
        notes: [
          "Use --clone for shared configuration with fresh sessions and memory.",
          "Use --clone-all only when you need a fuller snapshot; per-profile history remains excluded.",
        ],
      },
    };
  }

  if (usage === "hermes profile use <name>") {
    return {
      examples: [
        {
          title: "Select Work",
          command: "hermes profile use work",
          description: "Make work the sticky default for plain hermes commands.",
        },
        {
          title: "Return to Default",
          command: "hermes profile use default",
          description: "Restore the base profile as the sticky default.",
        },
      ],
      details: {
        whenToUse: "Choose a profile as the default for subsequent commands that do not include -p or --profile.",
        notes: ["Prefer hermes -p <name> for one-off commands when you do not want to change the sticky default."],
      },
    };
  }

  if (usage.startsWith("hermes -p <name>")) {
    return {
      examples: [
        { title: "Configure a Profile", command: "hermes -p work setup --portal" },
        { title: "Edit Profile Configuration", command: "hermes -p work config edit" },
        { title: "Validate a Profile", command: "hermes -p work doctor" },
        { title: "Chat with a Profile", command: "hermes -p work chat" },
      ],
      details: {
        whenToUse:
          "Target one profile for a command without changing the sticky default selected by hermes profile use.",
        notes: ["The generated <name> command alias is equivalent to hermes -p <name>."],
      },
    };
  }

  return {};
}

function parseProfileCommands(markdown) {
  const stableIdKeys = new Map([
    ["hermes profile create", "hermes profile create <name>"],
    ["hermes profile use", "hermes profile use <name>"],
  ]);

  return commandHeadingSections(markdown)
    .map(({ heading, content }) => {
      const commands = firstCommandBlock(content);
      if (!commands.length) return undefined;
      const usage = commands[0].replace(/\s+/g, " ").trim();
      const description = firstProseParagraph(content);
      if (!usage || !description) return undefined;

      const curated = curatedProfileContent(usage);
      const parameters = parametersFromSection(content);
      const persists = /^hermes profile (?:create|use|describe|delete|alias|rename|export|import|install|update)\b/.test(
        usage,
      );
      const details = {
        whenToUse: curated.details?.whenToUse ?? description,
        ...(curated.details?.prerequisites?.length
          ? { prerequisites: curated.details.prerequisites }
          : {}),
        ...(parameters.length ? { parameters } : {}),
        ...(curated.details?.workflow?.length ? { workflow: curated.details.workflow } : {}),
        ...(curated.details?.notes?.length ? { notes: curated.details.notes } : {}),
      };

      return createItem({
        category: "configuration",
        name: heading,
        description,
        usage,
        examples: curated.examples,
        aliases: commands.slice(1),
        tags: ["cli", "terminal", "configuration", "profile"],
        documentationUrl: `${DOCS_BASE}/reference/profile-commands#${docusaurusHeadingId(heading)}`,
        platforms: ["Terminal"],
        statuses: persists ? ["PERSISTS"] : [],
        details,
        idKey: stableIdKeys.get(heading) ?? heading,
      });
    })
    .filter(Boolean);
}

const URLS = {
  quickstart: `${DOCS_BASE}/getting-started/quickstart`,
  cli: `${DOCS_BASE}/user-guide/cli`,
  cliReference: `${DOCS_BASE}/reference/cli-commands`,
  slash: `${DOCS_BASE}/reference/slash-commands`,
  tools: `${DOCS_BASE}/user-guide/features/tools`,
  skills: `${DOCS_BASE}/user-guide/features/skills`,
  memory: `${DOCS_BASE}/user-guide/features/memory`,
  gateway: `${DOCS_BASE}/user-guide/messaging`,
  cron: `${DOCS_BASE}/user-guide/features/cron`,
  mcp: `${DOCS_BASE}/user-guide/features/mcp`,
  env: `${DOCS_BASE}/reference/environment-variables`,
  troubleshooting: `${DOCS_BASE}/reference/faq`,
  egress: `${DOCS_BASE}/user-guide/egress/iron-proxy`,
};

const manualItems = [
  createItem({
    category: "getting-started",
    name: "Install on Linux, macOS, WSL2, or Termux",
    description: "Run the official installer for Unix-like systems.",
    usage: "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash",
    tags: ["install", "macos", "linux", "wsl", "termux"],
    documentationUrl: URLS.quickstart,
    platforms: ["Terminal"],
  }),
  createItem({
    category: "getting-started",
    name: "Install on Windows",
    description: "Run the official native Windows installer from PowerShell.",
    usage: "iex (irm https://hermes-agent.nousresearch.com/install.ps1)",
    tags: ["install", "windows", "powershell"],
    documentationUrl: URLS.quickstart,
    platforms: ["PowerShell"],
  }),
  createItem({
    category: "getting-started",
    name: "Reload your shell",
    description: "Reload the shell configuration after installation so the hermes command is available.",
    usage: "source ~/.zshrc",
    example: "source ~/.bashrc",
    tags: ["install", "shell", "path"],
    documentationUrl: URLS.quickstart,
    platforms: ["Terminal"],
  }),
  createItem({
    category: "getting-started",
    name: "Quick setup with Nous Portal",
    description: "Sign in through OAuth, select Nous as the provider, and enable Tool Gateway routing.",
    usage: "hermes setup --portal",
    tags: ["setup", "nous", "oauth", "portal"],
    documentationUrl: URLS.quickstart,
    platforms: ["Terminal"],
  }),
  createItem({
    category: "getting-started",
    name: "Start the classic CLI",
    description: "Open an interactive Hermes conversation in the classic prompt_toolkit interface.",
    usage: "hermes",
    tags: ["start", "chat", "classic cli"],
    documentationUrl: URLS.quickstart,
    platforms: ["Terminal"],
  }),
  createItem({
    category: "getting-started",
    name: "Start the modern TUI",
    description: "Launch the modern terminal interface with overlays, mouse support, and non-blocking input.",
    usage: "hermes --tui",
    tags: ["start", "chat", "tui"],
    documentationUrl: URLS.quickstart,
    platforms: ["Terminal"],
  }),
  createItem({
    category: "getting-started",
    name: "Resume the latest session",
    description: "Continue the most recent conversation from the current profile.",
    usage: "hermes --continue",
    example: "hermes -c",
    tags: ["resume", "continue", "session"],
    documentationUrl: URLS.quickstart,
    platforms: ["Terminal"],
  }),
  createItem({
    category: "getting-started",
    name: "Check for updates",
    description: "Preview whether a Hermes Agent update is available without installing it.",
    usage: "hermes update --check",
    tags: ["update", "maintenance", "check"],
    documentationUrl: URLS.cliReference,
    platforms: ["Terminal"],
  }),

  ...[
    ["Enter", "Send the current message."],
    ["Alt+Enter / Ctrl+J / Shift+Enter", "Insert a new line for multi-line input."],
    ["Alt+V", "Paste an image from the clipboard when the terminal supports it."],
    ["Ctrl+V", "Paste text and opportunistically attach clipboard images."],
    ["Ctrl+B", "Start or stop voice recording when voice mode is enabled."],
    ["Ctrl+G", "Open the current input buffer in $EDITOR."],
    ["Ctrl+X Ctrl+E", "Open the current input buffer in $EDITOR using the Emacs-style binding."],
    ["Ctrl+C", "Interrupt the agent; press twice within two seconds to force exit."],
    ["Ctrl+D", "Exit Hermes."],
    ["Ctrl+Z", "Suspend Hermes on Unix; run fg in the shell to resume."],
    ["Tab", "Accept an auto-suggestion or autocomplete a slash command."],
  ].map(([shortcut, description]) =>
    createItem({
      category: "keyboard",
      name: shortcut,
      description,
      usage: shortcut,
      tags: ["keyboard", "shortcut", "keybinding"],
      documentationUrl: `${URLS.cli}#keybindings`,
      platforms: ["Interactive CLI"],
    }),
  ),

  createItem({
    category: "models",
    name: "Switch model for the current run",
    description: "Override the configured model without changing the saved default.",
    usage: "hermes chat --model <model>",
    example: "hermes chat --provider openrouter --model anthropic/claude-sonnet-4.6",
    tags: ["model", "provider", "override", "chat"],
    documentationUrl: `${URLS.cliReference}#hermes-chat`,
    platforms: ["Terminal"],
  }),
  createItem({
    category: "models",
    name: "Set the global default model",
    description: "Switch model and save it as the new global default in config.yaml.",
    usage: "/model <model-name> --provider <provider> --global",
    examples: [
      {
        title: "OpenAI Codex",
        command: "/model gpt-5.6-sol --provider openai-codex --global",
        description: "Example only: replace both values with a model and provider configured in your Hermes setup.",
      },
      {
        title: "Anthropic",
        command: "/model claude-sonnet-4-6 --provider anthropic --global",
        description: "Example only: replace both values with a model and provider configured in your Hermes setup.",
      },
    ],
    tags: ["model", "provider", "global", "config"],
    documentationUrl: `${URLS.cliReference}#model-slash-command-mid-session`,
    platforms: ["Interactive CLI", "Messaging"],
    statuses: ["PERSISTS"],
  }),
  createItem({
    category: "models",
    name: "List configured credentials",
    description: "Show configured credential entries and their providers.",
    usage: "hermes auth list",
    tags: ["auth", "credentials", "providers"],
    documentationUrl: `${URLS.cliReference}#hermes-auth`,
    platforms: ["Terminal"],
  }),
  createItem({
    category: "models",
    name: "Check authentication status",
    description: "Inspect authentication health for configured providers.",
    usage: "hermes auth status",
    tags: ["auth", "oauth", "status"],
    documentationUrl: `${URLS.cliReference}#hermes-auth`,
    platforms: ["Terminal"],
  }),

  ...[
    ["hermes config show", "Show current configuration values."],
    ["hermes config edit", "Open config.yaml in your editor."],
    ["hermes config get <key>", "Read one configuration value."],
    ["hermes config set <key> <value>", "Set a configuration value; secrets are routed to .env automatically."],
    ["hermes config unset <key>", "Remove an explicitly configured value."],
    ["hermes config path", "Print the active config.yaml path."],
    ["hermes config env-path", "Print the active .env path."],
    ["hermes config check", "Check for missing or stale configuration."],
    ["hermes config migrate", "Add newly introduced configuration options interactively."],
  ].map(([usage, description]) =>
    createItem({
      category: "configuration",
      name: usage,
      description,
      usage,
      tags: ["configuration", usage.includes("profile") ? "profile" : "config"],
      documentationUrl: URLS.cliReference,
      platforms: ["Terminal"],
    }),
  ),

  createItem({
    category: "configuration",
    name: "Install the egress proxy",
    description: "Download the Hermes-pinned iron-proxy binary, optionally replacing an existing installation.",
    usage: "hermes egress install [--force]",
    examples: [
      { title: "Install", command: "hermes egress install" },
      {
        title: "Force Reinstall",
        command: "hermes egress install --force",
        description: "Re-download the managed binary even when a copy already exists.",
      },
    ],
    tags: ["egress", "security", "sandbox", "iron-proxy"],
    documentationUrl: URLS.egress,
    platforms: ["Terminal"],
  }),
  createItem({
    category: "configuration",
    name: "Configure the egress proxy",
    description: "Generate the CA, credential mappings, proxy tokens, and proxy configuration used by remote sandboxes.",
    usage: "hermes egress setup [options]",
    examples: [
      { title: "Interactive Setup", command: "hermes egress setup" },
      { title: "Custom Tunnel Port", command: "hermes egress setup --tunnel-port 9091" },
      { title: "Use Bitwarden", command: "hermes egress setup --from-bitwarden" },
      { title: "Use Environment Credentials", command: "hermes egress setup --no-bitwarden" },
    ],
    tags: ["egress", "security", "sandbox", "credentials", "bitwarden"],
    documentationUrl: URLS.egress,
    platforms: ["Terminal"],
    statuses: ["PERSISTS"],
  }),
  ...[
    ["hermes egress start", "Start the managed egress proxy daemon."],
    ["hermes egress stop", "Stop the managed egress proxy daemon."],
    ["hermes egress restart", "Restart the egress proxy to apply credential or configuration changes."],
    ["hermes egress reload", "Hot-reload the egress ruleset without dropping connections."],
    ["hermes egress config", "Print the active proxy.yaml path for inspection."],
  ].map(([usage, description]) =>
    createItem({
      category: "configuration",
      name: usage,
      description,
      usage,
      tags: ["egress", "security", "sandbox", "iron-proxy"],
      documentationUrl: URLS.egress,
      platforms: ["Terminal"],
    }),
  ),
  createItem({
    category: "configuration",
    name: "Rotate egress proxy tokens",
    description: "Mint fresh proxy tokens for every provider and persist the new mappings.",
    usage: "hermes egress setup --rotate-tokens",
    tags: ["egress", "security", "sandbox", "credentials", "tokens", "rotation"],
    documentationUrl: URLS.egress,
    platforms: ["Terminal"],
    statuses: ["CAUTION", "PERSISTS", "RESTART"],
    warning:
      "This invalidates the proxy tokens in every running sandbox. Restart those sandboxes before their next upstream request.",
  }),
  createItem({
    category: "configuration",
    name: "Disable egress proxy injection",
    description: "Persist proxy.enabled = false for future sandboxes without stopping a running proxy daemon.",
    usage: "hermes egress disable",
    tags: ["egress", "security", "sandbox", "disable"],
    documentationUrl: URLS.egress,
    platforms: ["Terminal"],
    statuses: ["CAUTION", "PERSISTS"],
    warning:
      "Future Docker sandboxes will no longer receive proxy isolation and may receive real provider credentials instead.",
  }),
  createItem({
    category: "configuration",
    name: "Inspect egress proxy status",
    description: "Show binary, configuration, process, listener, and credential-mapping status with tokens redacted.",
    usage: "hermes egress status [--show-tokens]",
    example: "hermes egress status",
    tags: ["egress", "security", "sandbox", "status", "tokens"],
    documentationUrl: URLS.egress,
    platforms: ["Terminal"],
    warning: "Use --show-tokens only in a private terminal because it prints proxy tokens in full.",
  }),

  ...[
    ["hermes gateway run", "Run the messaging gateway in the foreground."],
    ["hermes gateway start", "Start the installed systemd or launchd gateway service."],
    ["hermes gateway stop", "Stop the gateway service or foreground process."],
    ["hermes gateway restart", "Restart the messaging gateway."],
    ["hermes gateway status", "Show gateway service status."],
    ["hermes gateway list", "List every profile and whether its gateway is running."],
    ["hermes gateway install", "Install the gateway as a systemd or launchd service."],
    ["hermes gateway uninstall", "Remove the installed gateway service."],
    ["hermes gateway setup", "Configure messaging platforms interactively."],
    ["hermes pairing list", "Show pending and approved messaging users."],
    ["hermes pairing approve <platform> <code>", "Approve a messaging-platform pairing code."],
    ["hermes pairing revoke <platform> <user-id>", "Revoke a user's messaging access."],
  ].map(([usage, description]) =>
    createItem({
      category: "gateway",
      name: usage,
      description,
      usage,
      tags: ["gateway", "messaging", usage.split(/\s+/).at(-1)],
      documentationUrl: URLS.gateway,
      platforms: ["Terminal"],
    }),
  ),

  createItem({
    category: "gateway",
    name: "Generate a Slack app manifest",
    description:
      "Generate the Slack app manifest and native slash-command registrations. Use --long-description for inline text or --long-description-file to preserve a UTF-8 file exactly.",
    usage: "hermes slack manifest [options]",
    examples: [
      { title: "Print Manifest", command: "hermes slack manifest" },
      { title: "Write Default File", command: "hermes slack manifest --write" },
      {
        title: "Write Custom File",
        command: "hermes slack manifest --write ./slack-manifest.json",
      },
      {
        title: "Long Description from File",
        command: "hermes slack manifest --long-description-file AGENTS.md --write",
        description: "The source text must be between 175 and 4,000 characters.",
      },
      { title: "Slash Commands Only", command: "hermes slack manifest --slashes-only" },
    ],
    tags: ["gateway", "messaging", "slack", "manifest", "slash commands"],
    documentationUrl: `${URLS.cliReference}#hermes-slack`,
    platforms: ["Terminal"],
  }),

  ...[
    ["hermes cron create <schedule> <prompt>", "Create a scheduled agent job."],
    ["hermes cron list", "List configured cron jobs."],
    ["hermes cron edit <job-id-or-name> [flags]", "Change a job's schedule, prompt, skills, workdir, or delivery."],
    ["hermes cron pause <job-id-or-name>", "Keep a job but stop scheduling it."],
    ["hermes cron resume <job-id-or-name>", "Re-enable a paused job and compute its next run."],
    ["hermes cron run <job-id-or-name>", "Trigger a job on the next scheduler tick."],
    ["hermes cron remove <job-id-or-name>", "Delete a scheduled job."],
    ["hermes cron status", "Show cron scheduler status."],
    ["hermes cron tick", "Manually run one scheduler tick."],
  ].map(([usage, description]) =>
    createItem({
      category: "automation",
      name: usage,
      description,
      usage,
      example: usage.startsWith("hermes cron create")
        ? 'hermes cron create "every 2h" "Check server status"'
        : undefined,
      tags: ["cron", "automation", "scheduled"],
      documentationUrl: URLS.cron,
      platforms: ["Terminal"],
    }),
  ),

  ...[
    ["hermes tools --summary", "Print the currently enabled toolsets and exit."],
    ["hermes setup tools", "Open the tool selection step of the setup wizard."],
    ["hermes computer-use install", "Install the cua-driver backend for Computer Use."],
    ["hermes computer-use status", "Check whether cua-driver is installed and show its version."],
    ["/tools list", "List tools available in the current session."],
    ["/tools disable <name>", "Disable one or more tools for the current session."],
    ["/tools enable <name>", "Enable one or more tools for the current session."],
    ["/browser connect", "Attach browser tools to a Chromium-family browser over CDP."],
    ["/browser disconnect", "Detach the current local browser connection."],
  ].map(([usage, description]) =>
    createItem({
      category: "tools",
      name: usage,
      description,
      usage,
      tags: ["tools", "toolsets", usage.includes("browser") ? "browser" : "terminal"],
      documentationUrl: URLS.tools,
      platforms: usage.startsWith("/") ? ["Interactive CLI"] : ["Terminal"],
    }),
  ),

  ...[
    ["hermes skills browse", "Browse available skills from configured registries."],
    ["hermes skills search <query>", "Search skill registries."],
    ["hermes skills inspect <identifier>", "Preview a skill without installing it."],
    ["hermes skills install <identifier>", "Install a skill from a registry, repository, or direct SKILL.md URL."],
    ["hermes skills list", "List installed skills."],
    ["hermes skills check", "Check installed hub skills for upstream updates."],
    ["hermes skills update", "Reinstall hub skills that have upstream changes."],
    ["hermes skills audit", "Re-scan installed hub skills for security issues."],
    ["hermes skills uninstall <identifier>", "Remove a hub-installed skill."],
    ["hermes skills publish", "Publish a skill to a configured registry."],
    ["hermes skills config", "Configure which skills are enabled per platform."],
    ["hermes memory setup", "Select and configure an external memory provider."],
    ["hermes memory status", "Show the current external memory provider configuration."],
    ["hermes memory off", "Disable the external provider while keeping built-in memory active."],
  ].map(([usage, description]) =>
    createItem({
      category: "skills-memory",
      name: usage,
      description,
      usage,
      tags: usage.includes("memory") ? ["memory", "persistent", "provider"] : ["skills", "skill hub", "registry"],
      documentationUrl: usage.includes("memory") ? URLS.memory : URLS.skills,
      platforms: ["Terminal"],
    }),
  ),

  ...[
    ["hermes mcp", "Open the interactive catalog picker for approved MCP servers."],
    ["hermes mcp catalog", "List approved MCP integrations in a scriptable format."],
    ["hermes mcp install <name>", "Install an approved MCP catalog entry."],
    ["hermes mcp add <name> [options]", "Add a custom stdio or HTTP MCP server and discover its tools."],
    ["hermes mcp list", "List configured MCP servers."],
    ["hermes mcp test <name>", "Test connection to a configured MCP server."],
    ["hermes mcp configure <name>", "Change tool selection for an MCP server."],
    ["hermes mcp login <name>", "Force OAuth re-authentication for an MCP server."],
    ["hermes mcp remove <name>", "Remove an MCP server from configuration."],
    ["hermes mcp serve", "Expose Hermes conversations as an MCP server over stdio."],
    ["/reload-mcp", "Reload MCP servers from config.yaml without restarting Hermes."],
  ].map(([usage, description]) =>
    createItem({
      category: "mcp",
      name: usage,
      description,
      usage,
      tags: ["mcp", "model context protocol", usage.includes("serve") ? "server" : "integration"],
      documentationUrl: URLS.mcp,
      platforms: usage.startsWith("/") ? ["Interactive CLI", "Messaging"] : ["Terminal"],
    }),
  ),

  ...[
    ["OPENROUTER_API_KEY", "OpenRouter API key for multi-provider model routing."],
    ["OPENAI_API_KEY", "OpenAI API key for direct OpenAI-compatible inference and tools."],
    ["ANTHROPIC_API_KEY", "Anthropic API key for direct Claude access."],
    ["GOOGLE_API_KEY", "Google AI Studio API key for Gemini models."],
    ["GEMINI_API_KEY", "Alternative Google AI Studio API key variable for Gemini."],
    ["GLM_API_KEY", "Z.AI / GLM provider API key."],
    ["KIMI_API_KEY", "Kimi / Moonshot provider API key."],
    ["DEEPSEEK_API_KEY", "DeepSeek provider API key."],
    ["NVIDIA_API_KEY", "NVIDIA NIM provider API key."],
    ["DASHSCOPE_API_KEY", "Alibaba Cloud DashScope API key for Qwen models."],
    ["HF_TOKEN", "Hugging Face unified router token."],
    ["FIRECRAWL_API_KEY", "Firecrawl API key for web scraping and cloud browser tools."],
    ["TAVILY_API_KEY", "Tavily API key for web search, extraction, and crawling."],
    ["SEARXNG_URL", "URL of a self-hosted SearXNG instance for web search."],
    ["EXA_API_KEY", "Exa API key for AI-native web search and content retrieval."],
    ["BRAVE_SEARCH_API_KEY", "Brave Search API subscription token."],
    ["BROWSER_CDP_URL", "Chrome DevTools Protocol URL for the local browser connection."],
    ["FAL_KEY", "FAL API key for image generation."],
    ["GROQ_API_KEY", "Groq API key for Whisper speech-to-text."],
    ["ELEVENLABS_API_KEY", "ElevenLabs API key for premium text-to-speech voices."],
    ["GITHUB_TOKEN", "GitHub token used by Skills Hub for rate limits and publishing."],
    ["HONCHO_API_KEY", "Honcho API key for cross-session user modeling."],
    ["DAYTONA_API_KEY", "Daytona API key for cloud sandbox terminal backends."],
    ["TERMINAL_ENV", "Terminal backend: local, docker, ssh, singularity, modal, or daytona."],
    ["TERMINAL_DOCKER_IMAGE", "Container image used by the Docker terminal backend."],
    ["TERMINAL_TIMEOUT", "Command timeout in seconds for terminal operations."],
    ["SUDO_PASSWORD", "Enable sudo commands without an interactive password prompt."],
    ["HERMES_TUI", "Set to 1 to launch the modern TUI by default."],
    ["HERMES_TIMEZONE", "IANA timezone override used by scheduling and time-aware behavior."],
    ["HERMES_HOME", "Override the active Hermes profile home directory."],
  ].map(([variable, description]) =>
    createItem({
      category: "environment",
      name: variable,
      description,
      usage: variable,
      example: `${variable}=<value>`,
      tags: ["environment variable", "env", variable.toLowerCase()],
      documentationUrl: URLS.env,
      platforms: ["Environment"],
    }),
  ),

  ...[
    ["hermes doctor", "Diagnose configuration, provider, dependency, and runtime issues."],
    [
      "hermes chat --safe-mode",
      "Disable user config, rules, memory, plugins, hooks, and MCP servers to isolate customization issues.",
    ],
    ["hermes dump", "Produce a copy-pasteable setup summary for support without exposing secrets."],
    ["hermes logs --tail", "Follow Hermes log output while reproducing a problem."],
    ["hermes debug", "Upload a debug report with system information and logs for support."],
    ["hermes config check", "Find missing, stale, or invalid configuration values."],
    ["hermes prompt-size", "Break down system-prompt and tool-schema size to diagnose context pressure."],
    ["hermes update --check", "Check whether an update is available without changing the installation."],
    ["/redraw", "Force a full terminal repaint after resize or rendering drift."],
    ["/reload", "Reload .env values into the active session after adding or changing API keys."],
  ].map(([usage, description]) =>
    createItem({
      category: "troubleshooting",
      name: usage,
      description,
      usage,
      tags: ["troubleshooting", "diagnostics", "support"],
      documentationUrl: usage.startsWith("/") ? URLS.slash : URLS.troubleshooting,
      platforms: usage.startsWith("/") ? ["Interactive CLI"] : ["Terminal"],
    }),
  ),
];

const commit = await getSourceCommit();
const [cliMarkdown, slashMarkdown, profileMarkdown] = await Promise.all([
  loadDocument(docs.cli, commit),
  loadDocument(docs.slash, commit),
  loadDocument(docs.profile, commit),
]);

const allItems = [
  ...manualItems,
  ...parseProfileCommands(profileMarkdown),
  ...parseTopLevelCommands(cliMarkdown),
  ...parseSlashCommands(slashMarkdown),
];
const seenIds = new Set();
const seenUsages = new Set();
const items = allItems.filter((item) => {
  if (seenIds.has(item.id) || seenUsages.has(item.usage)) return false;
  seenIds.add(item.id);
  seenUsages.add(item.usage);
  return true;
});

items.sort((left, right) => {
  const categoryCompare = left.category.localeCompare(right.category);
  return categoryCompare || left.name.localeCompare(right.name);
});

const payload = {
  source: {
    repository: REPOSITORY,
    commit,
    generatedAt: new Date().toISOString(),
  },
  items,
};

const formattedPayload = await format(JSON.stringify(payload), {
  parser: "json",
  printWidth: 120,
});
await writeFile(OUTPUT_PATH, formattedPayload, "utf8");
console.log(`Wrote ${items.length} Hermes Agent cheatsheet entries to ${OUTPUT_PATH}`);
