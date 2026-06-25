# Otty Raycast Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Raycast extension at `/Users/ethan/Documents/CodeHub/github/otty-raycast` that exposes Warp-style commands for the locally installed Otty terminal.

**Architecture:** Use a standard Raycast TypeScript extension. Keep command files small and route all terminal-launch behavior through `src/lib/otty.ts`, so path resolution, process execution, fallback behavior, and error formatting are consistent.

**Tech Stack:** Raycast API, TypeScript, Node.js `child_process`, Vitest or Raycast-compatible TypeScript tests.

---

## File Structure

- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/package.json` - Raycast manifest, scripts, preferences, and command definitions.
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/tsconfig.json` - TypeScript config.
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/lib/otty.ts` - Shared Otty CLI adapter.
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/open-in-otty.tsx` - Opens Otty.
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/new-window.tsx` - Opens a new Otty window.
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/new-tab.tsx` - Opens a tab, with fallback to window.
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/open-directory.tsx` - Opens selected directory in Otty.
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/run-command.tsx` - Runs user shell command in Otty.
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/ssh.tsx` - Opens SSH target in Otty.
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/lib/otty.test.ts` - Unit tests for helper behavior.
- Copy: `/Users/ethan/Documents/Codex/2026-06-24/qin/docs/superpowers/specs/2026-06-24-otty-raycast-extension-design.md` to `/Users/ethan/Documents/CodeHub/github/otty-raycast/docs/superpowers/specs/2026-06-24-otty-raycast-extension-design.md`.
- Copy: `/Users/ethan/Documents/Codex/2026-06-24/qin/docs/superpowers/plans/2026-06-24-otty-raycast-extension.md` to `/Users/ethan/Documents/CodeHub/github/otty-raycast/docs/superpowers/plans/2026-06-24-otty-raycast-extension.md`.

### Task 1: Scaffold Project

**Files:**

- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/package.json`
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/tsconfig.json`
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/lib/otty.ts`

- [ ] **Step 1: Create project directories**

Run:

```bash
mkdir -p /Users/ethan/Documents/CodeHub/github/otty-raycast/src/lib /Users/ethan/Documents/CodeHub/github/otty-raycast/docs/superpowers/specs /Users/ethan/Documents/CodeHub/github/otty-raycast/docs/superpowers/plans
```

Expected: directories exist.

- [ ] **Step 2: Add Raycast manifest and scripts**

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/package.json`:

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "otty",
  "title": "Otty",
  "description": "Warp-style Raycast commands for the Otty terminal.",
  "icon": "command-icon.png",
  "author": "ethan",
  "license": "MIT",
  "commands": [
    {
      "name": "open-in-otty",
      "title": "Open in Otty",
      "description": "Open Otty with a new default window.",
      "mode": "no-view"
    },
    {
      "name": "new-window",
      "title": "New Window",
      "description": "Open a new Otty window.",
      "mode": "no-view"
    },
    {
      "name": "new-tab",
      "title": "New Tab",
      "description": "Open a new Otty tab, falling back to a new window if needed.",
      "mode": "no-view"
    },
    {
      "name": "open-directory",
      "title": "Open Directory",
      "description": "Open a directory in Otty.",
      "mode": "no-view",
      "arguments": [
        {
          "name": "directory",
          "type": "text",
          "placeholder": "/path/to/directory",
          "required": true
        }
      ]
    },
    {
      "name": "run-command",
      "title": "Run Command",
      "description": "Run a shell command in Otty.",
      "mode": "no-view",
      "arguments": [
        {
          "name": "command",
          "type": "text",
          "placeholder": "npm run dev",
          "required": true
        }
      ]
    },
    {
      "name": "ssh",
      "title": "SSH",
      "description": "Open an SSH target in Otty.",
      "mode": "no-view",
      "arguments": [
        {
          "name": "target",
          "type": "text",
          "placeholder": "user@host or ssh://user@host",
          "required": true
        }
      ]
    }
  ],
  "preferences": [
    {
      "name": "ottyCliPath",
      "title": "Otty CLI Path",
      "description": "Path to the Otty control CLI.",
      "type": "textfield",
      "required": true,
      "default": "/Applications/Otty.app/Contents/MacOS/otty-cli"
    }
  ],
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "lint": "ray lint",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@raycast/api": "^1.100.0"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.0.4",
    "@types/node": "^22.0.0",
    "typescript": "^5.8.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: Add TypeScript config**

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/tsconfig.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 4: Add placeholder helper**

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/lib/otty.ts`:

```ts
export const DEFAULT_OTTY_CLI_PATH =
  "/Applications/Otty.app/Contents/MacOS/otty-cli";
```

### Task 2: Implement Otty Helper With Tests

**Files:**

- Modify: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/lib/otty.ts`
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/lib/otty.test.ts`

- [ ] **Step 1: Write tests**

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/lib/otty.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_OTTY_CLI_PATH,
  buildOpenDirectoryArgs,
  buildRunCommandArgs,
  normalizeSshTarget,
} from "./otty";

describe("Otty helper", () => {
  it("uses the installed app bundle CLI as the default", () => {
    expect(DEFAULT_OTTY_CLI_PATH).toBe(
      "/Applications/Otty.app/Contents/MacOS/otty-cli",
    );
  });

  it("builds open-directory args without embedding the directory in the shell source", () => {
    const args = buildOpenDirectoryArgs("/tmp/a dir; touch bad");

    expect(args.args).toEqual([
      "open",
      "-e",
      "/bin/zsh",
      "-lc",
      'cd "$OTTY_TARGET_DIR" && exec "${SHELL:-/bin/zsh}"',
    ]);
    expect(args.env).toMatchObject({
      OTTY_TARGET_DIR: "/tmp/a dir; touch bad",
    });
  });

  it("builds run-command args as an explicit user shell command", () => {
    expect(buildRunCommandArgs("npm run dev")).toEqual([
      "open",
      "-e",
      "/bin/zsh",
      "-lc",
      "npm run dev",
    ]);
  });

  it("normalizes ssh URL input", () => {
    expect(normalizeSshTarget("ssh://ethan@example.com")).toEqual({
      kind: "url",
      value: "ssh://ethan@example.com",
    });
  });

  it("normalizes bare ssh target input", () => {
    expect(normalizeSshTarget("ethan@example.com")).toEqual({
      kind: "target",
      value: "ethan@example.com",
    });
  });
});
```

- [ ] **Step 2: Implement helper**

Replace `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/lib/otty.ts`:

```ts
import { existsSync } from "node:fs";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

const execFileAsync = promisify(execFile);

export const DEFAULT_OTTY_CLI_PATH =
  "/Applications/Otty.app/Contents/MacOS/otty-cli";

type Preferences = {
  ottyCliPath?: string;
};

export type CommandArgs = {
  args: string[];
  env?: NodeJS.ProcessEnv;
};

export type SshTarget =
  | { kind: "url"; value: string }
  | { kind: "target"; value: string };

export function getConfiguredCliPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.ottyCliPath?.trim() || DEFAULT_OTTY_CLI_PATH;
}

export async function assertExecutable(path: string): Promise<void> {
  if (!existsSync(path)) {
    throw new Error(
      `Otty CLI not found at ${path}. Install Otty or update the Otty CLI Path preference.`,
    );
  }

  try {
    await access(path, constants.X_OK);
  } catch {
    throw new Error(`Otty CLI is not executable at ${path}.`);
  }
}

export async function runOtty(
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  const cliPath = getConfiguredCliPath();
  await assertExecutable(cliPath);
  await execFileAsync(cliPath, args, {
    env: { ...process.env, ...env },
  });
}

export async function runOttyCommand(
  label: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  try {
    await runOtty(args, env);
    await showToast({ style: Toast.Style.Success, title: label });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: `${label} failed`,
      message,
    });
  }
}

export async function openOtty(): Promise<void> {
  await runOttyCommand("Opened Otty", ["open"]);
}

export async function openNewWindow(): Promise<void> {
  await runOttyCommand("Opened new Otty window", ["open"]);
}

export async function openNewTab(): Promise<void> {
  try {
    await runOtty(["tab", "new"]);
    await showToast({
      style: Toast.Style.Success,
      title: "Opened new Otty tab",
    });
  } catch {
    await runOtty(["open"]);
    await showToast({
      style: Toast.Style.Success,
      title: "Opened new Otty window",
      message: "New tab was unavailable, so Otty opened a new window.",
    });
  }
}

export function buildOpenDirectoryArgs(directory: string): CommandArgs {
  return {
    args: [
      "open",
      "-e",
      "/bin/zsh",
      "-lc",
      'cd "$OTTY_TARGET_DIR" && exec "${SHELL:-/bin/zsh}"',
    ],
    env: { OTTY_TARGET_DIR: directory },
  };
}

export async function openDirectory(directory: string): Promise<void> {
  const command = buildOpenDirectoryArgs(directory);
  await runOttyCommand("Opened directory in Otty", command.args, command.env);
}

export function buildRunCommandArgs(command: string): string[] {
  return ["open", "-e", "/bin/zsh", "-lc", command];
}

export async function runShellCommand(command: string): Promise<void> {
  await runOttyCommand("Running command in Otty", buildRunCommandArgs(command));
}

export function normalizeSshTarget(input: string): SshTarget {
  const value = input.trim();
  return value.startsWith("ssh://")
    ? { kind: "url", value }
    : { kind: "target", value };
}

export async function openSshTarget(input: string): Promise<void> {
  const target = normalizeSshTarget(input);

  if (target.kind === "url") {
    await execFileAsync("/usr/bin/open", [target.value]);
    await showToast({
      style: Toast.Style.Success,
      title: "Opened SSH URL in Otty",
    });
    return;
  }

  await runOttyCommand(
    "Opening SSH in Otty",
    buildRunCommandArgs(`ssh ${target.value}`),
  );
}
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm test
```

Expected: all tests pass.

### Task 3: Add Raycast Commands

**Files:**

- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/open-in-otty.tsx`
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/new-window.tsx`
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/new-tab.tsx`
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/open-directory.tsx`
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/run-command.tsx`
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/ssh.tsx`

- [ ] **Step 1: Add no-view command files**

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/open-in-otty.tsx`:

```ts
import { openOtty } from "./lib/otty";

export default async function Command() {
  await openOtty();
}
```

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/new-window.tsx`:

```ts
import { openNewWindow } from "./lib/otty";

export default async function Command() {
  await openNewWindow();
}
```

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/new-tab.tsx`:

```ts
import { openNewTab } from "./lib/otty";

export default async function Command() {
  await openNewTab();
}
```

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/open-directory.tsx`:

```ts
import { openDirectory } from "./lib/otty";

type Arguments = {
  directory: string;
};

export default async function Command(props: { arguments: Arguments }) {
  await openDirectory(props.arguments.directory);
}
```

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/run-command.tsx`:

```ts
import { runShellCommand } from "./lib/otty";

type Arguments = {
  command: string;
};

export default async function Command(props: { arguments: Arguments }) {
  await runShellCommand(props.arguments.command);
}
```

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/src/ssh.tsx`:

```ts
import { openSshTarget } from "./lib/otty";

type Arguments = {
  target: string;
};

export default async function Command(props: { arguments: Arguments }) {
  await openSshTarget(props.arguments.target);
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: TypeScript exits with code 0.

### Task 4: Add Docs and Verify

**Files:**

- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/README.md`
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/docs/superpowers/specs/2026-06-24-otty-raycast-extension-design.md`
- Create: `/Users/ethan/Documents/CodeHub/github/otty-raycast/docs/superpowers/plans/2026-06-24-otty-raycast-extension.md`

- [ ] **Step 1: Add README**

Write `/Users/ethan/Documents/CodeHub/github/otty-raycast/README.md`:

````md
# Otty Raycast Extension

Warp-style Raycast commands for the locally installed Otty terminal.

## Commands

- Open in Otty
- New Window
- New Tab
- Open Directory
- Run Command
- SSH

## Local Setup

The extension defaults to:

```text
/Applications/Otty.app/Contents/MacOS/otty-cli
```
````

If your Otty CLI lives somewhere else, update the Raycast extension preference `Otty CLI Path`.

## Development

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run dev
```

````

- [ ] **Step 2: Copy spec and plan into project docs**

Run:

```bash
cp /Users/ethan/Documents/Codex/2026-06-24/qin/docs/superpowers/specs/2026-06-24-otty-raycast-extension-design.md /Users/ethan/Documents/CodeHub/github/otty-raycast/docs/superpowers/specs/2026-06-24-otty-raycast-extension-design.md
cp /Users/ethan/Documents/Codex/2026-06-24/qin/docs/superpowers/plans/2026-06-24-otty-raycast-extension.md /Users/ethan/Documents/CodeHub/github/otty-raycast/docs/superpowers/plans/2026-06-24-otty-raycast-extension.md
````

Expected: both files are present inside project docs.

- [ ] **Step 3: Install dependencies**

Run:

```bash
npm install
```

Expected: `node_modules` and `package-lock.json` are created.

- [ ] **Step 4: Run verification**

Run:

```bash
npm test
npm run typecheck
npm run lint
```

Expected: all commands exit with code 0. If lint requires Raycast-specific project metadata generated by `ray`, run `npm run build` and then repeat lint.

- [ ] **Step 5: Smoke test local Otty CLI**

Run:

```bash
/Applications/Otty.app/Contents/MacOS/otty-cli --version
```

Expected: prints the installed Otty CLI version.

- [ ] **Step 6: Commit project**

Run:

```bash
cd /Users/ethan/Documents/CodeHub/github/otty-raycast
git init
git add .
git commit -m "feat: add Otty Raycast extension"
```

Expected: initial commit is created.

## Self-Review

- Spec coverage: all six requested commands are covered by Task 1 manifest entries and Task 3 command files; Otty CLI preference and fallback behavior are covered by Task 2.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: command argument names match `package.json` manifest entries and command prop types.
