# Affinity

Find your Affinity files and inspect the documents currently open in Affinity by Canva from Raycast.

- **Search Affinity Files** finds Affinity Designer, Photo and Publisher files on your Mac with Spotlight, and opens, previews or reveals them. It works without any setup and does not need Affinity's MCP server.
- **Inspect Documents** searches the titles of open documents and reads their dimensions, DPI, page and spread counts, selection count, and save state. Open a document's layer inventory and copy layer names or document information.

Inspect Documents runs a fixed, read-only script through Affinity's own local MCP server. It does not change documents or selections, access files, use Canva AI, or send document data to a remote service.

## Setup for Inspect Documents

Only **Inspect Documents** needs these steps; **Search Affinity Files** works as soon as the extension is installed.

1. Install a version of Affinity by Canva that includes its MCP server and JavaScript SDK. Affinity V2 is not supported.
2. Open Affinity. In **Affinity → Settings → Model Context Protocol**, enable **Enable Affinity MCP**.
3. Open a document in Affinity, then run **Inspect Documents** in Raycast.

Only the MCP server is needed. Desktop file access, network access, saving scripts, task hints, and Canva AI permissions are not required. The extension uses loopback port 6767 and supports Affinity’s SSE transport on IPv6 and IPv4.

## Commands and actions

**Search Affinity Files** lists Affinity files found by Spotlight, with actions to open, preview with Quick Look, or reveal them in Finder. **Inspect Documents** searches open documents and displays their information. **Inspect Layers** displays their node names, nesting depth, visibility, and lock state. Copy actions copy information only when selected. **Refresh Documents** retrieves a new snapshot; the extension does not store or cache document contents.

Layer lists include the document’s spread and group nodes. To keep large files responsive, inspection is limited to 5,000 nodes per document and 100 levels of nesting.

## Compatibility

Affinity’s scripting SDK is in beta.

## Sources

- [Affinity’s official automation announcement](https://www.affinity.studio/blog/affinity-automation-scripting-claude)
- [Affinity connector setup](https://www.affinity.studio/help/ai-connector-setup/)
- [Affinity JavaScript SDK](https://sdk.affinity.studio/33000/)
- [Canva’s Affinity connector tool listing](https://claude.com/marketplace/connectors/affinity-106b90)
- [Raycast extension development](https://developers.raycast.com/basics/getting-started)
