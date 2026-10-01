# Get started with Jev

Jev uses [TypeSafe AI](https://typesafe.ai/) to categorize text, check requirements, suggest document folders, and search bookmarks by meaning. This is an independently developed integration.

1. Get an API key from the [TypeSafe console](https://console.typesafe.ai/), as described in its [quick start](https://docs.typesafe.ai/introduction/quickstart).
2. Enter it in the **TypeSafe API Key** password preference. Keep **Model** set to `jev-latest` unless TypeSafe provides another model identifier.
3. Open **Run Preset** and choose a saved check. Review the text before sending it.

A TypeSafe account with API access is required for Jev requests, and API usage may incur charges. Raycast AI is not required. Manual document filing and keyword bookmark search work without a key.

In **File Documents**, add your existing destination folders. In **Search Links**, choose the browser profiles and bookmark folders to search. Both commands guide you through their first use. **Actions → Set up Jev** includes a connection test and links to these screens.

Only explicit Jev actions send data to TypeSafe. They send the reviewed text or the selected bookmarks' metadata. Document moves require a separate confirmation.
