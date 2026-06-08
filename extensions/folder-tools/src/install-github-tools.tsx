import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import {
  ResultDetail,
  prefs,
  runInTerminal,
  runShellCapture,
  shellEscape,
} from "./lib";

type Values = {
  target: string;
  repo1: string;
  repo2: string;
  repo3: string;
  installCmd1?: string;
  installCmd2?: string;
  installCmd3?: string;
  mode: string;
};

type RepoSpec = {
  raw: string;
  url: string;
  name: string;
  ref?: string;
  installCmd?: string;
};

function parseRepo(rawValue: string, installCmd?: string): RepoSpec {
  let raw = rawValue.trim();
  let ref: string | undefined;
  if (raw.includes("#")) {
    const parts = raw.split("#");
    raw = parts[0];
    ref = parts.slice(1).join("#");
  }

  let url = raw;
  if (/^[\w.-]+\/[\w.-]+$/.test(raw)) {
    url = "https://github.com/" + raw + ".git";
  } else if (raw.startsWith("https://github.com/") && !raw.endsWith(".git")) {
    url = raw + ".git";
  }

  const name = raw
    .replace(/\.git$/, "")
    .replace(/^git@github\.com:/, "")
    .replace(/^https:\/\/github\.com\//, "")
    .split("/")
    .pop();

  if (!name) {
    throw new Error("Invalid GitHub repository: " + rawValue);
  }

  return { raw: rawValue, url, name, ref, installCmd };
}

function buildInstallCommand(values: Values): string {
  const target = values.target.trim();
  const repos = [
    parseRepo(values.repo1, values.installCmd1),
    parseRepo(values.repo2, values.installCmd2),
    parseRepo(values.repo3, values.installCmd3),
  ];

  const lines = [
    "set -e",
    "target=" + shellEscape(target),
    'prefix="$target/.github-tools"',
    'src="$prefix/src"',
    'bin="$prefix/bin"',
    'mkdir -p "$src" "$bin"',
  ];

  for (const repo of repos) {
    lines.push("echo Installing " + shellEscape(repo.raw));
    lines.push('repo_dir="$src/' + repo.name.replace(/"/g, "") + '"');
    lines.push(
      'if [ -d "$repo_dir/.git" ]; then git -C "$repo_dir" fetch --all --tags --prune; else git clone ' +
        shellEscape(repo.url) +
        ' "$repo_dir"; fi',
    );
    if (repo.ref) {
      lines.push('git -C "$repo_dir" checkout ' + shellEscape(repo.ref));
    } else {
      lines.push('git -C "$repo_dir" pull --ff-only || true');
    }
    if (repo.installCmd?.trim()) {
      lines.push(
        'TOOL_TARGET_DIR="$target" TOOL_PREFIX="$prefix" TOOL_BIN_DIR="$bin" TOOL_SOURCE_DIR="$repo_dir" sh -lc ' +
          shellEscape(repo.installCmd.trim()),
      );
    }
  }

  lines.push("printf '\\nTools installed under %s\\n' \"$prefix\"");
  return lines.join("\n");
}

export default function Command(props: { draftValues?: Values }) {
  const { push } = useNavigation();
  const p = prefs();
  const draft = props.draftValues;

  async function handleSubmit(values: Values) {
    if (
      !values.target.trim() ||
      !values.repo1.trim() ||
      !values.repo2.trim() ||
      !values.repo3.trim()
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Target and repositories are required",
      });
      return;
    }

    let command: string;
    try {
      command = buildInstallCommand(values);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid repository",
        message: String(error),
      });
      return;
    }

    if (values.mode === "terminal") {
      await runInTerminal(command, values.target.trim());
      return;
    }

    const result = await runShellCapture(
      "install github tools",
      command,
      values.target.trim(),
    );
    push(<ResultDetail result={result} />);
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Install Tools"
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="target"
        title="Folder"
        placeholder="~/Developer/my-project"
        defaultValue={draft?.target ?? p.defaultTarget}
      />
      <Form.Separator />
      <Form.TextField
        id="repo1"
        title="Repo 1"
        placeholder="owner/tool1 or https://github.com/owner/tool1"
        defaultValue={draft?.repo1}
      />
      <Form.TextField
        id="repo2"
        title="Repo 2"
        placeholder="owner/tool2"
        defaultValue={draft?.repo2}
      />
      <Form.TextField
        id="repo3"
        title="Repo 3"
        placeholder="owner/tool3#v1.2.0"
        defaultValue={draft?.repo3}
      />
      <Form.Separator />
      <Form.TextField
        id="installCmd1"
        title="Install Cmd 1"
        placeholder="Optional. Variables: TOOL_TARGET_DIR, TOOL_PREFIX, TOOL_BIN_DIR, TOOL_SOURCE_DIR"
        defaultValue={draft?.installCmd1}
      />
      <Form.TextField
        id="installCmd2"
        title="Install Cmd 2"
        placeholder="Optional"
        defaultValue={draft?.installCmd2}
      />
      <Form.TextField
        id="installCmd3"
        title="Install Cmd 3"
        placeholder="Optional"
        defaultValue={draft?.installCmd3}
      />
      <Form.Separator />
      <Form.Dropdown
        id="mode"
        title="Mode"
        defaultValue={draft?.mode ?? "terminal"}
      >
        <Form.Dropdown.Item
          value="terminal"
          title="Terminal: recommended for git clone and install"
          icon={Icon.Terminal}
        />
        <Form.Dropdown.Item
          value="raycast"
          title="Raycast: capture output"
          icon={Icon.Window}
        />
      </Form.Dropdown>
    </Form>
  );
}
