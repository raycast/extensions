# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Raycast extension ("Hole Sandbox Launcher") that launches [Hole](https://github.com/lukashornych/hole) sandbox environments in specified projects. Built with the Raycast API using React/TypeScript.

## Commands

- **Build:** `npm run build` (runs `ray build`)
- **Dev:** `npm run dev` (runs `ray develop` — starts Raycast extension in dev mode)
- **Lint:** `npm run lint` (runs `ray lint`)
- **Fix lint:** `npm run fix-lint` (runs `ray lint --fix`)

## Architecture

Single-command Raycast extension. Entry point is `src/launch-hole-sandbox.tsx`, which exports a `Command` component rendering a Raycast `List` view. Uses `@raycast/api` for UI components and `@raycast/utils` for data fetching (`useFetch`).

## Tech Stack

- TypeScript with React JSX (`react-jsx`)
- Target: ES2023, CommonJS modules
- Raycast ESLint config + Prettier for formatting

## Functionality

This extension launches a [Hole](https://github.com/lukashornych/hole) sandbox with a specified agent and project.

When launched, the extension should provide user with two inputs: agent and project projects. 
The agent is the name of the agent to use for the sandbox (fixed value: claude, gemini, codex),
and the project path is the path to the project to launch the sandbox in.
The agent input should be selected by default and using the tab key the user should be moved to the project input.
Using up and down arrow keys the user should be able to select the desired agent and recent used project project paths.
The extension should store the recent used project paths for the user to pick one or write a new one.

When both inputs are filled and the user presses enter, the extension should launch the sandbox using

```shell
hole start {agent} {project path}
```

In the extension menu, the user can select in which Terminal window the sandbox should be launched. Last used is picked
by default next time the extension is launched.
