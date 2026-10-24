# Skills

Search and manage AI agent skills from [Skills](https://skills.sh) directly in Raycast.

## Features

- Search for specific skills
- See which search results are already installed with a green check-circle indicator
- Identify skills installed from a different source with a conflict warning
- Filter available skills by owner
- Install skills for all supported agents
- View security audit status from `skills.sh` before installing
- View, update, and remove installed skills
- Check for skill updates — outdated skills are highlighted with an orange icon
- Filter installed skills by agent
- View skill source, install date, and update date from the lock file
- Open installed skill repositories on GitHub
- Open search result details in a full-screen view with SKILL.md content, including description, license, compatibility, and allowed tools
- See GitHub star counts in the detail view
- Copy install commands
- Quick access to GitHub repositories

## Commands

### Search Skills

Search for agent skills from skills.sh with real-time results. Results show which skills are installed locally and flag skills that may conflict with a local install from another source. Open a result to view full-screen details, including security audit status when available.

### Manage Skills

View, update, and remove installed skills. Outdated skills are highlighted with an orange icon and grouped in the "Updates Available" section. Filter by agent to see which skills are available for each AI agent.

## Using a Custom Package Registry (Corporate Proxy)

This extension runs the Skills CLI via `bunx`/`npx`, which download the `skills` package from a package registry. If your machine installs packages through a corporate proxy instead of the public npm registry, note that Raycast is launched by the OS and does **not** inherit environment variables from your shell profile (`~/.zshrc`, `~/.bash_profile`, etc.). Registry overrides set only as shell environment variables (for example `NPM_CONFIG_REGISTRY` or `BUN_CONFIG_REGISTRY`) will not reach the CLI.

Configure your registry in **files in your home directory**, which every launch context reads:

- **npm / npx** — `~/.npmrc`:

  ```
  registry=https://your-proxy.example.com/
  ```

- **bun / bunx** (tried first by this extension) — `~/.bunfig.toml`:

  ```toml
  [install]
  registry = "https://your-proxy.example.com/"
  ```

After editing these files, fully quit and relaunch Raycast so it re-reads the configuration. If automatic `npx` detection also fails, set **Custom npx Path** in the extension preferences.

## Screenshots

![Search Skills - Owner Filter](metadata/skills-1.png)
![Search Skills - Details](metadata/skills-2.png)
![Search Skills - Installed Status](metadata/skills-3.png)
![Manage Skills](metadata/skills-4.png)
