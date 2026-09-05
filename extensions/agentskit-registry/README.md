# AgentsKit Agents

Find and run agents from the public [AgentsKit Registry](https://registry.agentskit.io) without leaving Raycast.

The registry contains reusable, inspectable AI agent definitions for coding, research, support, marketing, legal,
clinical, fintech, and agency workflows. The extension runs the portable instruction layer with the published
AgentsKit runtime and your own model provider.

## What you can do

- Search agents by name, ID, category, package, or tag.
- Inspect descriptions, requirements, versions, and validation status.
- Run a task in **Portable Runtime** mode with OpenRouter, Gemini, or local Ollama.
- Change the model without changing the agent.
- Copy `npx agentskit add <agent-id>` for installable agents.
- Open the human-readable agent page or the public JSON definition.

## Setup

Open the extension preferences and configure at least one provider:

- **OpenRouter** — add your API key. The default `openrouter/free` model routes to an available free model.
- **Gemini** — add your Gemini API key. The default model is `gemini-2.5-flash`.
- **Ollama** — no API key is required. The default endpoint is `http://localhost:11434`.

Provider keys are Raycast password preferences. The extension connects directly to the selected provider; AgentsKit
does not receive or proxy the task or credentials.

## Execution boundary

Registry source files remain inspectable and installable, but this Store extension never evaluates remote
TypeScript. It executes only a registry definition's data-only `skill.systemPrompt`. Source-defined tools,
filesystem access, shell commands, and other side effects are not enabled. Each portable run is limited to one
runtime step, 2,048 output tokens, and 120 seconds. Cancelling a run aborts the provider stream.

## Data and privacy

The extension reads the public registry index and selected agent descriptor from `registry.agentskit.io`. It does not
collect analytics. Tasks are sent directly to the provider selected for that run.
