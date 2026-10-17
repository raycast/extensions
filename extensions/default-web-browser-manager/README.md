# Default Web Browser Manager

Conveniently set your default browser via Raycast commands.

## Command
- **Set Default Browser** (view): Lists installed browsers alphabetically, highlights the current default, and lets you set a new one.

## How it works
The extension uses a small Swift snippet executed via `swift -` to query macOS Launch Services:
- Retrieves all handlers for the `http` scheme.
- Looks up display names for each handler’s bundle ID.
- Sets the default handler using `LSSetDefaultHandlerForURLScheme`.

> You need the built-in macOS `swift` tool available (present by default on macOS). No extra dependencies are required.

---

**Tested only on macOS Tahoe 26.1 with Apple Swift version 6.1.2**  
I have no idea if it works on earlier or later macOS versions or with other Swift toolchains.
