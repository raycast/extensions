import { execFileSync } from "node:child_process"
import {
  PublishTask,
  type PublishPlan,
  type PublishTaskRunContext,
  type TegamiContext,
  type TegamiPlugin,
} from "tegami"

const PACKAGE_NAME = "grokcast"

interface ReleaseTarget {
  tag: string
  version: string
  title: string
  notes: string
  prerelease: boolean
}

/**
 * The extension is private, so Tegami versions it and does not publish it to npm.
 * This task creates the GitHub release and the `name@version` tag from the publish lock.
 */
export function githubRelease(): TegamiPlugin {
  return {
    name: "github-release",
    publishTasks() {
      return new GithubReleaseTask()
    },
  }
}

class GithubReleaseTask extends PublishTask<void> {
  name = "github:release"
  description =
    "Create the GitHub release and package tag. The extension is private and is not published to npm."

  override async status(opts: PublishTaskRunContext): Promise<"pending" | undefined> {
    const target = releaseTarget(opts.context, opts.plan)
    if (!target || opts.plan.options.dryRun) return undefined
    if (remoteTagExists(target.tag) && (await releaseExists(target.tag))) return undefined
    return "pending"
  }

  override async run(opts: PublishTaskRunContext): Promise<void> {
    const target = releaseTarget(opts.context, opts.plan)
    if (!target || opts.plan.options.dryRun) return
    if (!remoteTagExists(target.tag)) {
      if (!localTagExists(target.tag)) execFileSync("git", ["tag", target.tag])
      execFileSync("git", ["push", "origin", `refs/tags/${target.tag}:refs/tags/${target.tag}`])
    }
    if (!(await releaseExists(target.tag))) await createRelease(target)
  }
}

function releaseTarget(context: TegamiContext, plan: PublishPlan): ReleaseTarget | undefined {
  for (const [id, packagePlan] of plan.packages) {
    if (!packagePlan.updated) continue
    const pkg = context.graph.get(id)
    if (!pkg || pkg.name !== PACKAGE_NAME || !pkg.version) continue
    const notes = packagePlan.changelogs
      .flatMap((entry) =>
        entry.sections.flatMap((section) => [`### ${section.title}`, "", section.content, ""]),
      )
      .join("\n")
      .trim()
    const tag = packagePlan.git?.tag ?? `${pkg.name}@${pkg.version}`
    return {
      tag,
      version: pkg.version,
      title: `Grokcast v${pkg.version}`,
      notes: notes || `Published ${pkg.name} v${pkg.version}.`,
      prerelease: pkg.version.includes("-"),
    }
  }
  return undefined
}

function repository(): string {
  const repo = process.env.GITHUB_REPOSITORY?.trim() || "SolZeroAI/grokcast"
  const [owner, name] = repo.split("/", 2)
  if (!owner || !name || repo.split("/").length !== 2) {
    throw new Error(`GITHUB_REPOSITORY must be owner/name. Received ${JSON.stringify(repo)}.`)
  }
  return repo
}

function gitOutput(args: readonly string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim()
}

function remoteTagExists(tag: string): boolean {
  return gitOutput(["ls-remote", "--tags", "origin", `refs/tags/${tag}`]).length > 0
}

function localTagExists(tag: string): boolean {
  try {
    gitOutput(["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`])
    return true
  } catch {
    return false
  }
}

async function github(path: string, init?: RequestInit): Promise<Response> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/vnd.github+json")
  headers.set("X-GitHub-Api-Version", "2022-11-28")
  if (token) headers.set("Authorization", `Bearer ${token}`)
  return fetch(`https://api.github.com${path}`, { ...init, headers })
}

async function releaseExists(tag: string): Promise<boolean> {
  const [owner, name] = repository().split("/", 2)
  const response = await github(
    `/repos/${encodeURIComponent(owner ?? "")}/${encodeURIComponent(name ?? "")}/releases/tags/${encodeURIComponent(tag)}`,
  )
  if (response.status === 404) return false
  if (!response.ok) {
    throw new Error(`Could not check the GitHub release for ${tag} (HTTP ${response.status}).`)
  }
  return true
}

async function createRelease(target: ReleaseTarget): Promise<void> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN is required to create the GitHub release.")
  const [owner, name] = repository().split("/", 2)
  const response = await github(
    `/repos/${encodeURIComponent(owner ?? "")}/${encodeURIComponent(name ?? "")}/releases`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tag_name: target.tag,
        name: target.title,
        body: target.notes,
        prerelease: target.prerelease,
      }),
    },
  )
  if (response.ok) return
  if (response.status === 422) {
    const body = await response.text()
    if (body.includes("already_exists")) return
  }
  throw new Error(
    `Could not create the GitHub release for ${target.tag} (HTTP ${response.status}).`,
  )
}
