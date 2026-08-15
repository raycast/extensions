# Aside extension implementation rules

Before adding or substantially changing a command, review the pinned Raycast Store implementations for:

- [Google Chrome](https://github.com/raycast/extensions/tree/1fd087acfebf2aba02ebb28e4068f01b6eeba1d6/extensions/google-chrome/)
- [Dia](https://github.com/raycast/extensions/tree/6b7ae7e514f35a5eccb6ba753871b908d9bbd33d/extensions/dia/)
- [Arc](https://github.com/raycast/extensions/tree/6d794c9d3584e9863b16ce46ca0c2031512280f2/extensions/arc/)

Follow their conventions for command metadata, typed interfaces, shared browser adapters, loading and empty states, error handling, Raycast actions, preferences, documentation, screenshots, changelogs, AI tools/evals, and publishing configuration.

Use Aside's scripting dictionary through bundle ID `at.studio.AsideBrowser`. Do not use `System Events` UI automation when a native scripting object or command exists. Do not read Aside's private history or downloads databases.
