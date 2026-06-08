# Folder Tools

Run repeatable folder analysis and developer workflows from Raycast.

Folder Tools is useful when you work across many local projects and want one place to inspect a folder, run graphify workflows, start Understand-Anything, manage agent-brain, or launch a shell command in a selected working directory.

## Commands

- **Folder Tools**: dashboard for the configured default folder.
- **Analyze Folder**: run graphify, Understand-Anything or agent-brain workflows on any folder.
- **Install GitHub Tools**: clone or update three GitHub repositories into the selected folder's `.github-tools` directory.
- **Run Terminal Command**: run an arbitrary shell command in a selected working directory.

## Preferences

- **Tools Root**: folder containing installed tool binaries, virtual environments and source checkouts. The default is `~/.folder-tools/.github-tools`.
- **Default Target Folder**: folder used by the dashboard and as the default value in forms. The default is `~/Developer`.
- **Neo4j URL**: browser URL used by agent-brain.
- **Terminal App**: macOS terminal app used for interactive or long-running commands.

## Tool Layout

Folder Tools expects this optional layout when graphify, Understand-Anything or agent-brain are installed:

~~~text
~/.folder-tools/.github-tools/
  bin/
    graphify
    agent-brain
  venvs/
    graphify/bin/python
  src/
    Understand-Anything/
~~~

You can adapt the paths in Raycast preferences if your tools live somewhere else.

## Local Development

~~~bash
npm install
npm run lint
npm run typecheck
npm run build
npm run dev
~~~
