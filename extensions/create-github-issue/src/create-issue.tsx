import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";

import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { basename, join } from "path";
import { homedir } from "os";
import { useState } from "react";

// ─── Preferences ────────────────────────────────────────────────────────────

interface Preferences {
  vaultPath: string;
  reposFile: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function expandPath(p: string): string {
  return p.replace(/^~/, homedir());
}

function loadRepos(filePath: string): string[] {
  const resolved = expandPath(filePath);
  if (!existsSync(resolved)) return [];
  return readFileSync(resolved, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function walkDir(dir: string, root: string): string[] {
  let results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    // Skip hidden files/folders (like .obsidian, .trash)
    if (entry.startsWith(".")) continue;

    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(walkDir(fullPath, root));
    } else if (entry.endsWith(".md")) {
      // Store relative path from vault root
      results.push(fullPath.replace(root + "/", ""));
    }
  }
  return results.sort();
}

// ─── Confirmation View ──────────────────────────────────────────────────────

function ConfirmIssue({
  repo,
  title,
  filePath,
  relativePath,
}: {
  repo: string;
  title: string;
  filePath: string;
  relativePath: string;
}) {
  // const [isSubmitting, setIsSubmitting] = useState(false);
  const { pop } = useNavigation();

  const noteContent = existsSync(filePath)
    ? readFileSync(filePath, "utf-8")
    : "*Could not read file*";

  const preview = `
## 📦 New GitHub Issue

| Field | Value |
|-------|-------|
| **Repo** | \`${repo}\` |
| **Title** | ${title} |
| **Note** | \`${relativePath}\` |

---

### Note Preview

${noteContent}
`;

  async function handleSubmit() {
    // setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating issue…",
    });

    try {
      const escapedPath = filePath.replace(/(["$`\\])/g, "\\$1");
      const escapedTitle = title.replace(/(["$`\\])/g, "\\$1");

      const cmd = `/opt/homebrew/bin/gh issue create -R "${repo}" --title "${escapedTitle}" -F "${escapedPath}"`;
      const result = execSync(cmd, {
        encoding: "utf-8",
        timeout: 30000,
        env: {
          ...process.env,
          PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`,
        },
      });

      toast.style = Toast.Style.Success;
      toast.title = "Issue created!";
      toast.message = result.trim();
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: () => {
          const url = result.trim();
          if (url.startsWith("http")) {
            execSync(`open "${url}"`);
          }
        },
      };
    } catch (error: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create issue";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      // setIsSubmitting(false);
    }
  }

  return (
    <Detail
      markdown={preview}
      actions={
        <ActionPanel>
          <Action
            title="Create Issue"
            icon={{ source: "checkmark-circle-16" }}
            onAction={handleSubmit}
          />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

// ─── Main Form ──────────────────────────────────────────────────────────────

export default function CreateIssue() {
  const prefs = getPreferenceValues<Preferences>();
  const vaultPath = expandPath(prefs.vaultPath);
  const repos = loadRepos(prefs.reposFile);
  const notes = walkDir(vaultPath, vaultPath);
  const { push } = useNavigation();

  const [titleValue, setTitleValue] = useState("");
  const [, setSelectedNote] = useState("");

  function handleNoteChange(value: string) {
    setSelectedNote(value);
    // Auto-fill title from filename
    if (value) {
      const name = basename(value, ".md");
      setTitleValue(name);
    }
  }

  function handleSubmit(values: { repo: string; note: string; title: string }) {
    if (!values.repo) {
      showToast({ style: Toast.Style.Failure, title: "Please select a repo" });
      return;
    }
    if (!values.note) {
      showToast({ style: Toast.Style.Failure, title: "Please select a note" });
      return;
    }
    if (!values.title.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Please enter a title" });
      return;
    }

    const fullPath = join(vaultPath, values.note);

    push(
      <ConfirmIssue
        repo={values.repo}
        title={values.title}
        filePath={fullPath}
        relativePath={values.note}
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Review & Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="repo" title="GitHub Repo" storeValue>
        {repos.map((repo) => (
          <Form.Dropdown.Item key={repo} value={repo} title={repo} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Dropdown
        id="note"
        title="Obsidian Note"
        filtering
        onChange={handleNoteChange}
      >
        {notes.map((note) => (
          <Form.Dropdown.Item key={note} value={note} title={note} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="title"
        title="Issue Title"
        placeholder="Title for the GitHub issue"
        value={titleValue}
        onChange={setTitleValue}
      />
    </Form>
  );
}
