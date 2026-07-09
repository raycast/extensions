import type { HealthIssue } from "./types";

function shellDoubleQuotePath(path: string): string {
  return path.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildFixCommand(issue: HealthIssue): string {
  switch (issue.check) {
    case "H1":
      return `# target missing, re-link or remove:\nrm "${shellDoubleQuotePath(issue.meta.entryPath)}"`;

    case "H2":
      return `# SKILL.md missing or unparseable — inspect:\nls -la "${shellDoubleQuotePath(issue.meta.realPath)}"`;

    case "H3": {
      const dirPath = issue.meta.realPath;
      const expected = issue.meta.expectedName;
      const cur = issue.meta.currentDir;
      const parent = dirPath.slice(0, dirPath.length - cur.length);
      return [
        "# Option A — rename dir to match frontmatter.name:",
        `mv "${shellDoubleQuotePath(dirPath)}" "${shellDoubleQuotePath(parent + expected)}"`,
        `# Option B — instead edit frontmatter.name to '${cur}' in SKILL.md.`,
      ].join("\n");
    }

    case "H4":
      if (issue.meta.targetDir) {
        return `ln -s "${shellDoubleQuotePath(issue.meta.realPath)}" "${shellDoubleQuotePath(issue.meta.targetDir)}"`;
      }
      return `# diverged, inspect both:\ndiff -r "${shellDoubleQuotePath(issue.meta.claudePath)}" "${shellDoubleQuotePath(issue.meta.codexPath)}"`;

    case "H5":
      return (
        "# old versions (safe to remove if unused):\n" +
        issue.meta.paths
          .split("\n")
          .map((p) => `rm -rf "${shellDoubleQuotePath(p)}"`)
          .join("\n")
      );
  }
}
