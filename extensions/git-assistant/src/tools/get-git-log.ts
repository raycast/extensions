import { exec } from "child_process";

/**
 * Input for the get-git-log tool.
 * Controls how many recent commits are returned for a repository and optional date filtering.
 */
type Input = {
  /**
   * Absolute path to the Git repository to read commits from.
   */
  path: string;
  /**
   * Optional maximum number of commits to return (defaults to 20, capped at 100).
   */
  limit?: number;
  /**
   * Optional start timestamp for filtering commits. Accepts ISO 8601 format (e.g.,
   * "2024-01-15T14:30:25"), relative dates (e.g., "2 weeks ago", "yesterday"),
   * or absolute dates (e.g., "2024-01-15", "Jan 15 2024").
   */
  startTimestamp?: string;
  /**
   * Optional end timestamp for filtering commits. Accepts the same formats as startTimestamp.
   */
  endTimestamp?: string;
};

type GitLogEntry = {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  subject: string;
  body: string;
};

type GitLogResult = {
  path: string;
  commits: GitLogEntry[];
};

/**
 * Fetch recent commits for a repository using `git log` with a stable, parseable format.
 * Returns commit metadata suitable for summaries and explanations.
 */
export default async function (input: Input): Promise<GitLogResult> {
  const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 100) : 20;

  return new Promise((resolve, reject) => {
    const format = "%H%x1f%an%x1f%ae%x1f%ad%x1f%s%x1f%b%x1e";
    const filters: string[] = [];
    if (input.startTimestamp) {
      const escaped = input.startTimestamp.replace(/"/g, '\\"');
      filters.push(`--since="${escaped}"`);
    }
    if (input.endTimestamp) {
      const escaped = input.endTimestamp.replace(/"/g, '\\"');
      filters.push(`--until="${escaped}"`);
    }
    const filtersPart = filters.length ? " " + filters.join(" ") : "";
    const command = `git log -n ${limit} --date=iso-strict${filtersPart} --pretty=format:${format}`;

    exec(command, { cwd: input.path }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr.trim() || error.message);
        return;
      }

      const text = stdout;
      const commits: GitLogEntry[] = [];
      const records = text.split("\x1e").filter((record) => record.trim());

      for (const record of records) {
        const fields = record.split("\x1f");
        if (fields.length < 5) {
          continue;
        }

        const [hash, authorName, authorEmail, date, subject, body = ""] = fields;

        commits.push({
          hash: hash.trim(),
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim(),
          date: date.trim(),
          subject: subject.trim(),
          body: body.trim(),
        });
      }

      resolve({
        path: input.path,
        commits,
      });
    });
  });
}
