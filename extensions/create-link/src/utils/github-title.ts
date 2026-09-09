import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GH_CLI_CANDIDATES = ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh"];
const GH_CLI_TIMEOUT_MS = 5000;
export async function fetchGitHubTitleViaCli(url: URL): Promise<string | undefined> {
  if (url.hostname !== "github.com") return undefined;

  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/(pull|issues|discussions)\/(\d+)(?:\/|$)/);
  if (!match) return undefined;

  const ghPath = GH_CLI_CANDIDATES.find((path) => existsSync(path));
  if (!ghPath) return undefined;

  const [, owner, name, kind, number] = match;
  const args =
    kind === "discussions"
      ? [
          "api",
          "graphql",
          "-f",
          "query=query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { discussion(number: $number) { title } } }",
          "-f",
          `owner=${owner}`,
          "-f",
          `name=${name}`,
          "-F",
          `number=${number}`,
          "--jq",
          ".data.repository.discussion.title // empty",
        ]
      : [
          kind === "pull" ? "pr" : "issue",
          "view",
          number,
          "--repo",
          `${owner}/${name}`,
          "--json",
          "title",
          "-q",
          ".title",
        ];

  try {
    const { stdout } = await execFileAsync(ghPath, args, {
      timeout: GH_CLI_TIMEOUT_MS,
      killSignal: "SIGKILL",
      env: { ...process.env, GH_HOST: "github.com", GH_PROMPT_DISABLED: "1", GH_PAGER: "cat" },
    });
    return stdout.trim() || undefined;
  } catch {
    // Do not log subprocess stderr: it can contain authenticated repository details.
    console.warn("GitHub title lookup failed or timed out; falling back to page HTML.");
    return undefined;
  }
}
