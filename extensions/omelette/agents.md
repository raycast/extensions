# OpenRouter Raycast Extension — Agent Guidelines

## React: NO useEffect

Direct `useEffect` calls are **banned**. This is enforced via `no-restricted-imports` in both ESLint and oxlint.

### The only exception: `useMountEffect`

For one-time synchronization with an external system on mount, use `useMountEffect()` from `src/hooks/useMountEffect.ts`.

Valid uses: DOM integration, external system sync, browser API subscriptions. Nothing else.

### Rules

1. **Derive state, do not sync it.** If state can be computed from other state or props, compute it inline. Never write `useEffect(() => setX(f(y)), [y])`.
2. **Use data-fetching libraries.** Do not fetch inside effects. Use query libraries or `useMountEffect` for initial loads.
3. **Event handlers, not effects.** If work is triggered by a user action, do it in the handler.
4. **Conditional mounting over guards.** Do not put `if (!ready)` guards inside effects. Mount the component only when preconditions are met.
5. **Reset with `key`, not dependency choreography.** If you need to restart when an ID changes, use React's `key` prop to force remount.

## Models

### Popular models list (`src/api/models.ts`)

When updating the popular models list, use **current model IDs** verified against the OpenRouter API (`https://openrouter.ai/api/v1/models`). The list should include models from:

- **OpenAI** — latest GPT models (e.g., `openai/gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano`)
- **Anthropic** — latest Claude models (e.g., `anthropic/claude-opus-4.6`, `claude-sonnet-4.6`)
- **Google** — latest Gemini and Gemma models
- **NVIDIA** — free Nemotron models (e.g., `nvidia/nemotron-3-super-120b-a12b:free`)
- **MiniMax, GLM (Z.ai), Kimi (MoonshotAI)** — as available on OpenRouter

### Fallback model

Do **not** use Meta Llama models as defaults or fallbacks. Use NVIDIA's free models instead:
- Primary fallback: `nvidia/nemotron-3-super-120b-a12b:free`
- Secondary fallback: `nvidia/nemotron-3-nano-30b-a3b:free`

### Default model in preferences

The `defaultModel` preference in `package.json` should use a free NVIDIA model, not a Llama model.

## Tooling

- **Package manager**: `bun` (not npm)
- **Linting**: `bun run lint:ox` (oxlint) for fast local checks, `bun lint` (ray lint) for Raycast compatibility
- **Formatting**: `bun run fmt` (oxfmt) for fast local formatting, Prettier via `ray lint` for Raycast compatibility
- **Type checking**: `bunx tsc --noEmit`
- **Build**: `bun run build`

## Code Style

- Use ES modules (import/export), not CommonJS
- Destructure imports when possible
- Never use `as any` — use proper type casts or redesign the type signature
- No `useEffect` — see above
