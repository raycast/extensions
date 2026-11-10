<div align="center">
    <img src="./media/extension-icon.png" alt="Edits" width="100"/>
    <h3>Edits</h3>
    <p>Browse and organize Instagram Edits projects from Raycast</p>
</div>

Edits is a Raycast extension that lets you browse, open, duplicate, rename, favorite, and pin Instagram Edits projects from Raycast or **Ask Edits**, using Edits' native local MCP server.

**Initial implementation, validated with Edits 454.0.0 on Apple silicon.** This is an independent extension, not affiliated with Meta or Instagram. Text overlay replacement is supported through Raycast AI. Other video editing, media import, export, and publishing are not implemented in this release.

## Setup

1. Install [Edits for Mac](https://edits.instagram.com/desktop/) and complete sign-in inside Edits.
2. In Edits, open **Settings → Automation** and enable **Automation Server**.
3. Copy its **Endpoint** and **Access token** into this extension's preferences. Both use Raycast password preferences. Do not enter Instagram credentials.
4. Run **Connection Status**. Keep Edits open while using project commands.

The endpoint is supplied by your installed application; the extension has no default port or endpoint. It supports the verified Streamable HTTP transport with bearer authentication, restricted to `localhost`, `127.0.0.1`, or `[::1]`. Other transports, remote servers, OAuth flows, redirects, and arbitrary client executables are unsupported.

After changing the token or restarting Edits, update preferences if necessary and refresh. **Open Edits** works without MCP credentials.

## Commands

| Command               | Behavior                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Search Projects       | Search the live project list; open by ID, duplicate, rename, favorite, pin, or copy the project reference.   |
| Open Edits            | Find and launch Edits using its verified macOS bundle identifier.                                            |
| Connect to Edits      | Show setup steps and let you check the connection.                                                           |
| Connection Status     | Verify a connection and show a timestamped capability snapshot.                                              |
| Discover Capabilities | Inspect tool input schemas and resource metadata. Does not invoke arbitrary tools or read resource contents. |

Project actions appear only when their live input schemas match the verified contracts. Return to Edits' home screen to duplicate projects. Refresh after changing screens; Edits exposes different tools at home and in the editor.

The extension checks a project's ID against a fresh listing before changing it. Duplication, renaming, and favorite/pin updates are confirmed against another listing before success is shown. Cloud refresh failures are visible, so a partial listing is not mistaken for a complete one.

## Raycast AI

Open **Ask Edits**, or mention **@Edits** in Raycast AI Chat. It uses the same endpoint and secure token preferences as the graphical commands.

Examples:

- “Find my Weekend projects.”
- “Open Weekend Reel.”
- “Duplicate Weekend Reel.”
- “Rename Weekend Reel to Weekend Highlights.”
- “Mark Weekend Reel as a favorite.”
- “Pin Weekend Reel.”
- “List the text overlays in Weekend Reel.”
- “Change the opening WEEKEND VIBES text to WEEKEND REWIND, keeping the line break.”

Nine tools are available: `list-projects`, `check-connection`, `open-project`, `duplicate-project`, `rename-project`, `set-project-favorite`, `set-project-pinned`, `list-project-text`, and `edit-project-text`. Mutations use exact project IDs and the same live schema and result checks as the UI. Raycast asks for confirmation before duplicating, renaming, changing favorite/pin status, or editing text. Repeating a desired favorite/pin state leaves it unchanged.

Text inspection opens the exact project and returns overlay text, IDs, and timing. Text editing checks the original text, replaces only the selected overlay, saves, and closes/reopens the project to verify persistence. It preserves the existing styling and timing. Keep the editor idle while an AI edit is running; native editor operations act on the open project.

If multiple projects share a name, the AI should ask which one you mean. A failed or uncertain mutation returns a non-retryable result; check Edits before trying again. Plain result objects are returned to avoid serialization failures after a successful change.

### Why native AI tools instead of an MCP manifest entry?

Raycast supports [`ai.mcp`](https://developers.raycast.com/information/manifest#mcp-server), which adds an MCP server's tools to the extension's AI identity. This extension uses declared native AI tools that call the existing local MCP service instead. That preserves the tested operation subset, secure preference handling, schema validation, confirmation, and read-back verification. A direct connection would expose additional Edits tools that this extension has not validated. No `ai.mcp` entry or credentials are embedded in the manifest.

When you use Raycast AI, project metadata and inspected text overlays returned by these tools becomes context for Raycast's selected AI model. The extension still sends all Edits operations only to the local application; it does not send video files to the AI.

## Limitations

- **Create Project is withheld:** the tested server reports successful creation and saving of an empty project, but the project disappears after closing. It cannot be advertised as a persisted project workflow.
- **Media import and Finder workflows are withheld:** a generated local test video was rejected with a sandbox-bookmark error. Another native MCP import route also failed. No private project database or sandbox workaround is used.
- Text replacement is available through AI. Other editing and export tools can be inspected but are not exposed as commands. Aspect-ratio changes were exercised on a test copy but are not shipped.
- Presets, captions, LUTs, export history, and publishing remain later phases. Nothing is automatically published or deleted.
- A successful connection check is a snapshot, not a continuously monitored connection. Sessions close after each operation; there is no background polling or persistent project cache.
- If a mutation loses its response, the extension reports an unknown outcome. Check Edits and refresh before manually retrying. It never automatically retries editing or project mutations.
- Automation being disabled cannot be inferred reliably from a network failure; diagnostics ask you to check it instead of asserting a false state.

## Privacy and security

All MCP traffic goes to the configured loopback origin. Tokens, raw transport errors, and endpoint secrets are not logged. The extension does not inspect Instagram sessions, upload media, modify Edits' internal database, or use a separate backend. Metadata is held in memory for the current command. The capability viewer redacts connection secrets reflected in server metadata.

Do not share automation credentials. Anyone holding a token can control Edits while its server is enabled. Disable automation in Edits when you no longer want local clients to connect.
