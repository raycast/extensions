import type { HealthIssue } from "./types";

export function buildFixCommand(issue: HealthIssue): string {
  switch (issue.check) {
    case "H1":
      return `# target missing, re-link or remove:\nrm "${issue.meta.entryPath}"`;

    case "H2":
      return `# SKILL.md missing or unparseable — inspect:\nls -la "${issue.meta.realPath}"`;

    case "H3": {
      const dirPath = issue.meta.realPath;
      const expected = issue.meta.expectedName;
      const cur = issue.meta.currentDir;
      const parent = dirPath.slice(0, dirPath.length - cur.length);
      return [
        "# Option A — rename dir to match frontmatter.name:",
        `mv "${dirPath}" "${parent}${expected}"`,
        `# Option B — instead edit frontmatter.name to '${cur}' in SKILL.md.`,
      ].join("\n");
    }

    case "H4":
      if (issue.meta.targetDir) {
        return `ln -s "${issue.meta.realPath}" "${issue.meta.targetDir}"`;
      }
      return `# diverged, inspect both:\ndiff -r "${issue.meta.claudePath}" "${issue.meta.codexPath}"`;

    case "H5":
      return (
        "# old versions (safe to remove if unused):\n" +
        issue.meta.paths
          .split("\n")
          .map((p) => `rm -rf "${p}"`)
          .join("\n")
      );
  }
}
