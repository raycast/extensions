# AI Status

Check official AI-provider service health without opening a collection of status pages. AI Status brings each enabled provider's published system status, components, active incidents, and recent incident history into one native Raycast command.

## Features

- See provider-published health at a glance, with matching severity icons.
- Open component groups to inspect individual services.
- Read active incidents and their update timelines inside Raycast.
- Open any provider's official status page for the original source.
- Show cached last-known results immediately while a quiet background refresh runs.
- Enable only the providers you use from Raycast preferences.

The default list includes OpenAI, Claude, Google AI Studio and Gemini, xAI, DeepSeek, and OpenRouter. The full catalog also covers Mistral AI, Cohere, Perplexity, Groq, Together AI, Fireworks AI, Cerebras, Replicate, Hugging Face, Baseten, ElevenLabs, and Stability AI.

## Usage

1. Run **Check AI Status**.
2. Press Enter on a provider to see its components and incidents.
3. Press Enter on a component group or incident to open its local detail view.
4. Use the action panel to open the official source, refresh, or configure providers.

Providers are grouped by purpose in preferences. Disabled providers are neither displayed nor fetched.

## Privacy

AI Status makes unauthenticated requests only to the enabled providers' public, official status sources. It does not ask for provider credentials, run model prompts, collect analytics, or use an extension-specific backend. Last-successful responses are cached locally by Raycast so the list can remain useful during a temporary source failure.

## Notes

AI Status is an independent project and is not affiliated with the providers it displays. Provider names and marks belong to their respective owners. See [Third-Party Notices](THIRD_PARTY_NOTICES.md) for bundled icon attribution.

## Development

```bash
nvm use
npm ci
npm run dev
```

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` before submitting a change. `npm run check:sources` is an opt-in live check of every official status source; the regular test suite is deterministic and runs from local fixtures.
