# AI Provider Status

Check official service health across popular AI providers without opening or maintaining a collection of status-page URLs. AI Provider Status ships with a curated catalog of provider integrations: choose the providers you use in Raycast preferences, then inspect their published system health, components, active incidents, and recent incident updates from one native command.

Unlike a general-purpose status-page monitor, there are no URLs to add, detect, or maintain. Each supported AI provider is integrated with its official public status source, including provider-specific handling when status systems expose different components or incident formats.

## Features

- Choose from 19 built-in AI providers with no status-page setup.
- See provider-published health at a glance, with matching severity icons.
- Preview each service's published component history and exact uptime when its official source provides them.
- Inspect components and incident timelines in one provider screen: select a row to preview its details beside the list.
- Filter the screen to All, Components, or Incidents, with clear messages when history is unavailable or not published.
- Press Enter on a component or incident to open its official source, or open the provider's status page from the action panel.
- Show cached last-known results immediately and refresh stale results in the background.
- Keep the provider list and selected details in sync when you refresh.
- Enable only the providers you use from Raycast preferences.

The default list includes OpenAI, Claude, Google AI Studio and Gemini, xAI, DeepSeek, and OpenRouter. The full catalog also covers Moonshot AI, MiniMax, Mistral AI, Cohere, Perplexity, Groq, Together AI, Fireworks AI, Cerebras, Hugging Face, Baseten, ElevenLabs, and Stability AI.

## Usage

1. Run **Check AI Provider Status**.
2. Press Enter on a provider to see its components and incidents.
3. Select **Overview**, a component, or an incident to inspect its details in the right panel. An active incident is selected first when one exists.
4. Use the **All / Components / Incidents** dropdown and search to narrow the list.
5. Press Enter to open the selected item's official source. Use the action panel to refresh; configure providers from the main provider list.
6. Press Escape to return to the provider list.

History availability varies by provider and component. The extension shows the source's chart whenever it can reproduce it faithfully, displays uptime only when the source publishes or precisely measures that percentage, and does not manufacture missing history from the current operational state.

A history request failure leaves current status available and identifies incomplete history. “No Recent Incidents” appears only after incident history was retrieved successfully.

Mistral's detailed component history uses built-in macOS networking and needs no browser installation. If those details are unavailable, including on Windows when the page blocks direct access, its public JSON status and official-page link remain available.

Providers are grouped by purpose in preferences. Disabled providers are neither displayed nor fetched.

## Privacy

AI Provider Status makes unauthenticated requests only to the enabled providers' public, official status sources. It does not ask for provider credentials, run model prompts, collect analytics, or use an extension-specific backend. Last-successful responses are cached locally by Raycast so the list can remain useful during a temporary source failure.

## Notes

AI Provider Status is an independent project and is not affiliated with the providers it displays. Provider names and marks belong to their respective owners. See [Third-Party Notices](THIRD_PARTY_NOTICES.md) for bundled icon attribution.
