# Open With App

Choose any installed macOS application to open the items currently selected
in your file manager.

The frontmost application is checked at runtime: when it's a supported file
manager (currently **Finder** or **[Bloom](https://bloomapp.club)**), the
selection is read from there. Finder is the fallback in every other case,
so the command keeps working from any context.

## Adding a file manager

Implement the `FileManagerProvider` interface in `src/file-managers/types.ts`
and register the new class in `src/file-managers/registry.ts`. Each provider
needs a display name, the app's bundle identifier, and a method that returns
the selected POSIX paths (typically via `runAppleScript`).
