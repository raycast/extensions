import { Keyboard } from "@raycast/api";
import { brewPrefixCliPath } from "../cli/discovery";
import { CLI_BINARY_NAME, CLI_SEARCH_PATHS } from "../cli/preferences";
import { compareVersions, normalizeVersion } from "../cli/version";
import { HOMEBREW_URL } from "../homebrew/constants";
import {
  CLI_INSTALL_COMMAND,
  CLI_INSTALL_DOCS_URL,
  CLI_LINK_COMMAND,
  CLI_TERMINAL_UPDATE_COMMAND,
  CLI_REINSTALL_COMMAND,
  CLI_RELINK_COMMAND,
  CLI_REPO_HOME_URL,
  CLI_SOURCE_INSTALL_COMMAND,
  DEVELOPER_TOOLS_DOCS_URL,
  MIN_CLI_VERSION,
} from "./constants";
import { setupNeedsUpdate, type CliSetup, type CliSetupState } from "./detection";
import type { CliOperation } from "./installation";
import type { CliSetupLifecycle } from "./lifecycle";

export type SetupAction =
  | { type: "run"; title: string; operation: CliOperation }
  | { type: "copy"; title: string; content: string }
  | { type: "open"; title: string; url: string; shortcut?: Keyboard.Shortcut }
  | { type: "preferences"; title: string }
  | { type: "refresh"; title: string };

export interface SetupScreen {
  title: string;
  body: string;
  /** Action groups in panel order. Each group renders as one section. */
  actions: SetupAction[][];
  isLoading: boolean;
}

/** `update` and `source-cli` each split into an update screen and a shared up-to-date screen. */
type SetupScreenKind = Exclude<CliSetupState, "source-cli"> | "source-update" | "up-to-date";

interface ScreenContent {
  title: string;
  /** Paragraphs in reading order; `undefined` entries are omitted. */
  body: Array<string | undefined>;
  actions: SetupAction[][];
  isLoading?: boolean;
}

interface NoteRule {
  when: (setup: CliSetup) => boolean;
  text: string;
}

// Actions

const INSTALL_DOCS: SetupAction = {
  type: "open",
  title: "Open Installation Instructions",
  url: CLI_INSTALL_DOCS_URL,
  shortcut: Keyboard.Shortcut.Common.Open,
};

const HOMEBREW_DOCS: SetupAction = {
  type: "open",
  title: "Open Homebrew Installation Instructions",
  url: HOMEBREW_URL,
  shortcut: Keyboard.Shortcut.Common.Open,
};

const DEVELOPER_TOOLS_DOCS: SetupAction = {
  type: "open",
  title: "Open Apple's Installation Instructions",
  url: DEVELOPER_TOOLS_DOCS_URL,
  shortcut: Keyboard.Shortcut.Common.Open,
};

const GITHUB: SetupAction = {
  type: "open",
  title: "Open Pods Control on GitHub",
  url: CLI_REPO_HOME_URL,
  shortcut: Keyboard.Shortcut.Common.OpenWith,
};

const PREFERENCES: SetupAction = { type: "preferences", title: "Open Extension Preferences" };

const REFRESH: SetupAction = { type: "refresh", title: "Refresh" };

// Version notes

/** Notes that apply to any installed CLI. At most one shows; the first matching rule wins. */
const STATUS_NOTES: readonly NoteRule[] = [
  { when: isNewerThanKnownRelease, text: "This install is newer than the known release." },
  { when: (setup) => setup.liveCheckFailed, text: "Could not confirm the latest release." },
  { when: (setup) => Boolean(setup.configuredCliPath), text: "Using the saved **CLI Path**." },
];

/** Update screens additionally explain an unreadable version, which is itself a reason to update. */
const UPDATE_NOTES: readonly NoteRule[] = [
  { when: (setup) => setup.versionStatus === "unknown", text: "Could not determine the CLI version." },
  ...STATUS_NOTES,
];

// Homebrew link guidance

type LinkState = "linked" | "unlinked" | "unknown";

/** Homebrew's own link status decides the likely cause and whether a plain link can succeed. */
const LINK_GUIDANCE: Record<LinkState, { cause: string; command: string }> = {
  linked: {
    cause: "Homebrew reports the formula as already linked, so the link is broken or something else owns that path.",
    command: CLI_RELINK_COMMAND,
  },
  unlinked: {
    cause: `Homebrew has not linked the formula, so the \`${CLI_BINARY_NAME}\` command does not exist yet.`,
    command: CLI_LINK_COMMAND,
  },
  unknown: {
    cause: "Homebrew could not report whether the formula is linked. An unlinked formula is the usual cause.",
    command: CLI_LINK_COMMAND,
  },
};

const SEARCHED_PATHS = CLI_SEARCH_PATHS.map((path) => `\`${path}\``).join(" or ");

// Screens

const SETUP_SCREENS: Record<SetupScreenKind, (setup: CliSetup) => SetupScreen> = {
  installing: () =>
    screen({
      title: "Installing pods-control CLI…",
      body: [
        "Homebrew already has an install or update in progress. This can take several minutes. Keep Raycast running until it finishes.",
      ],
      actions: [[GITHUB]],
      isLoading: true,
    }),
  "needs-homebrew": () =>
    screen({
      title: "Install Homebrew",
      body: ["Homebrew is not installed.", `Follow [Homebrew's official installation instructions](${HOMEBREW_URL}).`],
      actions: [[HOMEBREW_DOCS, GITHUB], [REFRESH]],
    }),
  "needs-developer-tools": () =>
    screen({
      title: "Install Apple's developer tools",
      body: [
        "Apple's developer tools are needed to install the pods-control CLI.",
        `Follow [Apple's official installation instructions](${DEVELOPER_TOOLS_DOCS_URL}).`,
      ],
      actions: [[DEVELOPER_TOOLS_DOCS, GITHUB], [REFRESH]],
    }),
  "invalid-cli-path": (setup) =>
    screen({
      title: "Fix pods-control CLI Path",
      body: [
        "Raycast could not find the pods-control CLI at the saved **CLI Path**.",
        code(setup.configuredCliPath ?? ""),
        "Clear or correct it in Extension Preferences.",
      ],
      actions: [[PREFERENCES], [GITHUB], [REFRESH]],
    }),
  "needs-link": (setup) => {
    const { cause, command } = LINK_GUIDANCE[linkState(setup)];
    return screen({
      title: "Finish pods-control CLI setup",
      body: [
        `Homebrew installed the CLI at ${kegCliLabel(setup)}, but Raycast needs it at ${SEARCHED_PATHS}.`,
        cause,
        "Copy the command and run it in Terminal.",
        code(command),
        `If that does not help, set **CLI Path** in Extension Preferences to ${kegCliLabel(setup)}.`,
      ],
      actions: [[{ type: "copy", title: "Copy Link Command", content: command }, PREFERENCES], [GITHUB], [REFRESH]],
    });
  },
  "needs-reinstall": (setup) =>
    screen({
      title: "Repair pods-control CLI",
      body: [
        `Homebrew lists the formula, but there is no usable \`${CLI_BINARY_NAME}\` binary at ${kegCliLabel(setup)}. The install is incomplete, so linking cannot fix it.`,
        "Copy the command and run it in Terminal. Homebrew builds from source, so this can take several minutes.",
        code(CLI_REINSTALL_COMMAND),
      ],
      actions: [
        [{ type: "copy", title: "Copy Reinstall Command", content: CLI_REINSTALL_COMMAND }],
        [GITHUB],
        [REFRESH],
      ],
    }),
  install: () =>
    screen({
      title: "Install pods-control CLI",
      body: [
        "The pods-control CLI is not installed. Homebrew and Apple's developer tools are ready.",
        "Choose **Install with Homebrew**, or copy the install command and run it in Terminal. Homebrew can take several minutes; keep Raycast running until it finishes.",
        `To install from source, follow the [installation instructions](${CLI_INSTALL_DOCS_URL}).`,
      ],
      actions: [
        [
          { type: "run", title: "Install with Homebrew", operation: "install" },
          { type: "copy", title: "Copy Install Command", content: CLI_INSTALL_COMMAND },
        ],
        [INSTALL_DOCS, GITHUB],
        [REFRESH],
      ],
    }),
  update: (setup) =>
    screen({
      title: "Update pods-control CLI",
      body: [
        updateFacts(setup),
        firstNote(UPDATE_NOTES, setup),
        minimumVersionNote(setup),
        "Choose **Update with Homebrew** to install the latest version, or copy the update command and run it in your Terminal.",
        "Homebrew can take several minutes to install the update; keep Raycast running until it finishes.",
      ],
      actions: [
        [
          { type: "run", title: "Update with Homebrew", operation: "update" },
          { type: "copy", title: "Copy Update Command", content: CLI_TERMINAL_UPDATE_COMMAND },
        ],
        [INSTALL_DOCS, GITHUB],
        [REFRESH],
      ],
    }),
  "source-update": (setup) =>
    screen({
      title: "Update pods-control CLI",
      body: [
        updateFacts(setup),
        firstNote(UPDATE_NOTES, setup),
        minimumVersionNote(setup),
        "Copy the source install command and run it in your Terminal. Use the same installation method and location.",
        `For the full source-install steps, follow the [installation instructions](${CLI_INSTALL_DOCS_URL}).`,
      ],
      actions: [
        [{ type: "copy", title: "Copy Source Install Command", content: CLI_SOURCE_INSTALL_COMMAND }],
        [INSTALL_DOCS, GITHUB],
        [REFRESH],
      ],
    }),
  "up-to-date": (setup) =>
    screen({
      title: "pods-control CLI is up to date",
      body: [installedFacts(setup), firstNote(STATUS_NOTES, setup), minimumVersionNote(setup)],
      actions: [[GITHUB]],
    }),
};

const OPERATION_PROGRESS: Record<CliOperation, string> = { install: "Installing", update: "Updating" };

const LIFECYCLE_SCREENS: {
  [S in CliSetupLifecycle["status"]]: (lifecycle: Extract<CliSetupLifecycle, { status: S }>) => SetupScreen;
} = {
  checking: () =>
    screen({ title: "pods-control CLI", body: ["Checking your installation…"], actions: [], isLoading: true }),
  ready: ({ setup }) => setupScreen(setup),
  running: ({ operation }) =>
    screen({
      title: `${OPERATION_PROGRESS[operation]} CLI…`,
      body: ["This can take several minutes. Keep Raycast running until it finishes."],
      actions: [],
      isLoading: true,
    }),
  failed: ({ error }) =>
    screen({
      title: "pods-control CLI needs attention",
      body: [indent(error)],
      actions: [[{ type: "copy", title: "Copy Error", content: error }], [INSTALL_DOCS, GITHUB], [REFRESH]],
    }),
};

export function lifecycleScreen(lifecycle: CliSetupLifecycle): SetupScreen {
  // The map is keyed by status, so the entry always accepts this lifecycle variant.
  const build = LIFECYCLE_SCREENS[lifecycle.status] as (lifecycle: CliSetupLifecycle) => SetupScreen;
  return build(lifecycle);
}

export function setupScreen(setup: CliSetup): SetupScreen {
  return SETUP_SCREENS[setupScreenKind(setup)](setup);
}

export function screenMarkdown({ title, body }: SetupScreen): string {
  return [`# ${title}`, body].filter(Boolean).join("\n\n");
}

function setupScreenKind(setup: CliSetup): SetupScreenKind {
  if (setup.state === "update") return setupNeedsUpdate(setup) ? "update" : "up-to-date";
  if (setup.state === "source-cli") return setupNeedsUpdate(setup) ? "source-update" : "up-to-date";
  return setup.state;
}

function screen({ title, body, actions, isLoading = false }: ScreenContent): SetupScreen {
  return { title, body: paragraphs(body), actions, isLoading };
}

// Body fragments

const METHOD_LABEL: Record<NonNullable<CliSetup["installationMethod"]>, string> = {
  homebrew: "Homebrew",
  source: "Source",
};

function installedFacts(setup: CliSetup): string {
  return bullets([installedVersionFact(setup), installMethodFact(setup), cliPathFact(setup)]);
}

function updateFacts(setup: CliSetup): string {
  return bullets([installedVersionFact(setup), latestVersionFact(setup), installMethodFact(setup), cliPathFact(setup)]);
}

function installedVersionFact(setup: CliSetup): string {
  return `- **Version:** ${setup.installedVersion ?? "unknown"}`;
}

function latestVersionFact(setup: CliSetup): string {
  return `- **Latest:** ${setup.latestVersion ?? "unknown"}`;
}

function installMethodFact(setup: CliSetup): string {
  return `- **Install method:** ${setup.installationMethod ? METHOD_LABEL[setup.installationMethod] : "unknown"}`;
}

function cliPathFact(setup: CliSetup): string | undefined {
  return setup.cliPath ? `- **Path:** \`${setup.cliPath}\`` : undefined;
}

function firstNote(rules: readonly NoteRule[], setup: CliSetup): string | undefined {
  return rules.find((rule) => rule.when(setup))?.text;
}

function minimumVersionNote(setup: CliSetup): string | undefined {
  if (setup.meetsMinimum !== false) return undefined;
  const minimum = normalizeVersion(MIN_CLI_VERSION) ?? MIN_CLI_VERSION;
  return `The CLI is older than the minimum this extension requires (${minimum}).`;
}

function isNewerThanKnownRelease(setup: CliSetup): boolean {
  return Boolean(
    setup.installedVersion && setup.latestVersion && compareVersions(setup.installedVersion, setup.latestVersion) === 1,
  );
}

function linkState(setup: CliSetup): LinkState {
  if (setup.brewLinked === true) return "linked";
  if (setup.brewLinked === false) return "unlinked";
  return "unknown";
}

function kegCliLabel(setup: CliSetup): string {
  return setup.brewCliPrefix ? `\`${brewPrefixCliPath(setup.brewCliPrefix)}\`` : "its Homebrew prefix";
}

// Formatting

function paragraphs(items: Array<string | undefined>): string {
  return items.filter((item): item is string => item !== undefined).join("\n\n");
}

function bullets(items: Array<string | undefined>): string {
  return items.filter((item): item is string => item !== undefined).join("\n");
}

function code(value: string): string {
  const fence = "`".repeat(Math.max(3, ...Array.from(value.matchAll(/`+/g), ([match]) => match.length + 1)));
  return `${fence}\n${value}\n${fence}`;
}

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}
