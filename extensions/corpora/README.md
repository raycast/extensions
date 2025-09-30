# Corpora

Corpora is a [Raycast AI Extension](https://developers.raycast.com/ai/learn-core-concepts-of-ai-extensions) for [Pro](https://www.raycast.com/pro) users. It makes your [AI Chats](https://www.raycast.com/core-features/ai), [Presets](https://ray.so/presets/code), and [Prompts](https://ray.so/prompts/code) more accurate and context-aware. Corpora will be on the [Raycast Store](https://www.raycast.com/store) soon. Learn more about AI Extensions with the [Raycast Manual](https://manual.raycast.com/ai-extensions).

## Background

> [Tools](https://developers.raycast.com/information/terminology#tool) are a type of entry point for an [extension](https://developers.raycast.com/information/terminology#extension). As opposed to a [command](https://developers.raycast.com/information/terminology#command), they don't show up in the root search and the user can't directly interact with them. Instead, they are functionalities that the AI can use to interact with an extension.

Corpora is just a set of tools and commands to `upsert` and `retrieve` context. Tools are invoked intelligently by Raycast AI, and are the best way to ingest and inject [context]. Commands are invoked intentionally by the user, and are the fastest way to manage a [corpus].

Raycast's built-in Finder extension can read corpora and create context. But I've improved the workflow according to a few factors:

- [Natural language to tool calls](https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-01-natural-language-to-tool-calls.md). Call [tools](https://developers.raycast.com/information/terminology#tool) by mentioning `@Corpora` in AI Chat, AI Chat Presets, and AI Commands (Prompts).
- [Own your prompts](https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-02-own-your-prompts.md). They're the language between your logic and your LLM.
- [Own your context window](https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-03-own-your-context-window.md). Pipeline custom, consolidated inputs to produce the best outputs.
- [Own your control flow](https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-08-own-your-control-flow.md). Integrate with the way you work, like consuming GitHub PRs and Linear Issues.
- [Unify execution state and business state](https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-05-unify-execution-state.md). Versionable context, without vendor lock-in.
- Be a [stateless reducer](https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-12-stateless-reducer.md).

I've also reimplemented `fs` operations to support *all* text-based files (.js, .ts, tsx, .go) and execute intelligently with Raycast AI.

Use `New Corpus` to convert a Corpus folder into Context documents. Use `View Corpura` to list and use the markdown. Or, mention `@Corpora` in AI Chat, AI Chat Presets, and AI Commands to upsert and retrieve context with natural language.

## Developers

**Requirements**: Raycast Pro, Node.js, macOS

**Recommendations**: Raycast Pro with Advanced AI, Node.js via `nvm`, Linear/GitHub integration

1. `git clone https://github.com/keshsad/corpora`
2. `bun install && bun run dev`
3. `Import Extension` Command
