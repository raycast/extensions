import { access, writeFile } from "node:fs/promises"
import { join } from "node:path"
import * as DateTime from "effect/DateTime"
import { tegami, type LogGenerator } from "tegami"
import { runCli } from "tegami/cli"
import { github } from "tegami/plugins/github"
import { githubRelease } from "./github-release.mts"

const repository = process.env.GITHUB_REPOSITORY?.trim() || "SolZeroAI/grokcast"
const publishedPackageId = "npm:grokcast"

// The Raycast Store reads CHANGELOG.md and wants each entry as `## [Title] - YYYY-MM-DD`.
// The first entry is "Initial Version", as the Store suggests; later ones use the version.
const storeChangelog: LogGenerator = {
  async generate({ pkg, packageDraft }) {
    const isFirst = await access(join(pkg.path, "CHANGELOG.md")).then(
      () => false,
      () => true,
    )
    const title = isFirst ? "Initial Version" : (pkg.version ?? "Unreleased")
    const date = DateTime.formatIsoDateUtc(DateTime.nowUnsafe())
    const sections = (packageDraft.changelogs ?? []).flatMap((entry) =>
      entry.sections.flatMap((section) => [`### ${section.title}`, "", section.content, ""]),
    )
    return [`## [${title}] - ${date}`, "", ...sections].join("\n").trim()
  },
}

const release = tegami({
  conventionalCommits: false,
  generator: storeChangelog,
  npm: {
    client: "nub",
    updateLockFile: false,
  },
  plugins: [
    // github() opens the version pull request. The extension is private, so that
    // plugin does not publish to npm or create the release tag. githubRelease()
    // creates the GitHub release and the name@version tag from the publish lock.
    // The Raycast Store submission is a separate, manual step (see CONTRIBUTING.md).
    github({
      repo: repository,
      release: {
        eager: false,
        create({ pkg, plan }) {
          const sections = (plan.packages.get(pkg.id)?.changelogs ?? []).flatMap((entry) =>
            entry.sections.flatMap((section) => [`### ${section.title}`, "", section.content, ""]),
          )
          return {
            title: `Grokcast v${pkg.version}`,
            notes: sections.join("\n").trim(),
          }
        },
      },
      versionPr: {
        base: "master",
        branch: "tegami/version-packages",
      },
    }),
    {
      name: "root-version-file",
      // Tegami's npm plugin applies first and has already bumped pkg.version.
      // Bumping it again here wrote one version too far (0.2.0 for 0.1.0).
      async applyDraft() {
        const pkg = this.graph.get(publishedPackageId)
        if (!pkg?.version) return
        await writeFile(join(this.cwd, "VERSION"), `${pkg.version}\n`)
      },
    },
    githubRelease(),
  ],
})

await runCli(release)
