# Skills Manager for Raycast

Browse, search, install and deploy your shared AI agent-skill library from Raycast.

This extension is a front end for [Skills Manager](https://github.com/xingkongliang/skills-manager) and its `skills-manager-cli` binary. It implements no logic of its own: every action shells out to the CLI in `--json` mode and renders the result. The CLI shares its database and repository lock with the Skills Manager desktop app, so anything you do here shows up there, and the other way round.

## Requirements

The Skills Manager desktop app:

```bash
brew install --cask skills-manager
```

Open it once after installing. The app publishes a version-matched CLI to `~/.skills-manager/bin`, which is the copy this extension prefers. A standalone CLI on your `PATH` also works.

## Commands

**My Skills** — the library. Filter by agent, preset, tag or source, read a skill's `SKILL.md`, deploy it to an agent, tag it, or remove it.

**Search Skills** — the skills.sh marketplace. Install counts are shown because they are the only trust signal available; anything under 100 is flagged. Installing puts a skill in your library and nothing else, so the extension offers the deploy step immediately rather than letting you discover the gap later.

**Presets** — reusable groups of skills. Deploy or undeploy a whole preset, and edit its membership. Membership is organization only: it changes nothing in any agent until you deploy.

**Agents** — the agents detected on this Mac, and whether Skills Manager may write to them. Disabling an agent removes every managed skill from it, so that one asks first.

**Check for Skill Updates** — probes upstream for every git-backed skill and applies the updates you pick.

## Things worth knowing

**Installing is not deploying.** A skill enters the central library first and stays invisible to your agents until it is deployed. Both install actions in Search Skills lead you to the deploy step.

**A refused deploy has not broken anything.** If a target directory holds something Skills Manager does not own, the whole deployment is refused, nothing is written, and nothing at that path is touched. You get a screen naming the paths, with the option to adopt the directory into your library. The extension will never delete or move a file it did not create.

**A held-back update is not an error.** Updating replaces a skill's directory wholesale, so when the new version lacks files you have today, the CLI applies nothing and reports those paths instead. The skill stays on its old version. There is no override flag on purpose — confirm it in the desktop app if the files are expendable. Note that a file you *edited* which the new version also ships is not protected: its path survives, so your edits are overwritten silently.

## What this extension deliberately does not do

- The `git` command group (backup, sync, restore). High-consequence and interactive; it belongs in the desktop app.
- The legacy exclusive-sync workflow (`skills sync`, `presets apply`, `presets deactivate`) and the deprecated `skills enable` / `skills disable`, all discouraged upstream.
- `skills set-source --force`, which replaces a library copy wholesale with no held-back check. Only a person should authorize that.

## Preferences

**CLI Path** — an absolute path to `skills-manager-cli`, for unusual installs. Leave it empty to auto-detect, which is what you want in almost every case.

## Development

```bash
npm install && npm run dev
```

Publishing to the Raycast Store additionally needs screenshots in `metadata/`.
