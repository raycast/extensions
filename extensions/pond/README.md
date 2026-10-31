<div align="center">
    <br/>
    <br/>
    <img src="./assets/pond-icon.png" alt="Pond" width="100"/>
    <h3>Pond</h3>
    <p>Search your library, save web pages, and switch libraries from Raycast</p>
    <br/>
</div>

This extension connects Raycast to [Pond](https://github.com/raphaelsalaja/pond), the personal web archiver for macOS. It includes search with image previews, URL capture, tags, library switching, eight Raycast AI tools, and Pond's native MCP server.

## What comes from Pond?

Pond already provides an authenticated local API, an MCP server, and [its own Raycast extension](https://github.com/raphaelsalaja/pond/tree/main/apps/raycast). This project is a standalone Raycast client built against that API. It adds a guided setup check, browser-tab capture, tag and date filters, tagged saves, and broader Raycast AI coverage. The MCP server is built into Pond; this extension registers it with Raycast.

You do not need to modify Pond or build its monorepo to use this extension. The app icon and API schemas come from Pond, with attribution in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Get started

You need **macOS**, **Raycast**, and **Pond 1.0.1 or later**.

1. [Install Pond](https://github.com/raphaelsalaja/pond/releases), open it, and choose a library.
2. Import this extension for local development:

   ```sh
   npm install
   npm run dev
   ```

3. Run **Set up Pond** in Raycast. Choose **Open Pond Settings**, then go to **General → Raycast → Copy Token**.
4. Choose **Open Extension Preferences** and paste the token into **Local API Token**.
5. Return to **Set up Pond** and press **⌘R**. A successful check shows your Pond version, active library, and save count.

Keep Pond running when searching or saving. Pond's **Launch at Login** and **Launch in Background** settings can help. **Open Library** and the setup guide work before a token is configured.

The default **Local API URL** is `http://127.0.0.1:41610/api/v2`. Change the port only if you changed it in Pond.

## Commands

| Command                      | Use it to                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Search Library**           | Browse recent saves or search by keyword. Filter by source, exact tag, or saved date; preview images and metadata; open links or copy a saved file. |
| **Save URL**                 | Archive a URL with optional comma-separated tags. You can also pass the URL as a command argument.                                                  |
| **Save Clipboard URL**       | Archive the web URL on your clipboard.                                                                                                              |
| **Save Current Browser Tab** | Archive the page in the front browser window.                                                                                                       |
| **Switch Library**           | Choose a recent library. Active and unavailable libraries are marked.                                                                               |
| **Open Library**             | Bring Pond to the front and open the active library.                                                                                                |
| **Set up Pond**              | Follow the setup steps and check the connection, token, Pond version, and active library.                                                           |

### Search and organize

Search uses Pond's own library search. The source dropdown narrows it to a platform such as X, Instagram, Pinterest, or Are.na. Open **Filter Saves** to add an exact tag and a **Saved Since** date. You can also select a tag in a save's metadata to filter by it. Results load as you scroll.

| Shortcut | Action                                  |
| -------- | --------------------------------------- |
| Return   | Open the selected save in Pond          |
| ⌘O       | Open its original web page              |
| ⌘C       | Copy its original URL                   |
| ⇧⌘C      | Copy its first saved file               |
| ⇧⌘F      | Filter by tag and saved date            |
| ⌘R       | Refresh results or check the connection |

**Copy File** asks Pond to copy the original file reference, ready to paste into another app. Saves without a downloaded file show an error. If you change libraries or Pond updates the library while you're scrolling, refresh the search before continuing.

### Save a page

Use **Save URL** for a URL and optional tags such as `design, inspiration`. Pond merges supplied tags into an existing save, preserving its other tags. Without tags, saving an existing URL reports **Already in Pond**.

**Queued in Pond** means Pond accepted the URL for processing. It does not mean that archiving has finished. These commands send the URL and any tags; they do not send browser cookies or authenticated page content. Use Pond's browser extension when a capture needs that integration.

**Save Current Browser Tab** supports Safari, Chrome, Arc, Brave, Edge, Chromium, and Vivaldi. Run it with your browser in front. macOS may ask you to allow Raycast to control the browser under **System Settings → Privacy & Security → Automation**. For other browsers, use **Save Clipboard URL**.

## Raycast AI

Use `@pond` in Raycast AI to work with your library:

- `@pond find my saved typography references`
- `@pond find saves from X tagged inspiration saved since 2026-10-01`
- `@pond save https://example.com/article and tag it reading`
- `@pond which library is active and how many saves does it have?`
- `@pond switch to my Research library`
- `@pond open that save in Pond`

| Tool             | Capability                                                                       |
| ---------------- | -------------------------------------------------------------------------------- |
| Search Library   | Search by keywords, source, exact tag, and saved date; paginate through results. |
| Get Save         | Read a specific save's current metadata using its save and library IDs.          |
| Save URL         | Queue a URL or add requested tags to an existing saved URL.                      |
| Get Library Info | Read the active library's name, path, and save count.                            |
| List Libraries   | Find recent libraries and check their availability.                              |
| Switch Library   | Switch to an available library resolved from the recent list.                    |
| Open Save        | Open a resolved save in Pond.                                                    |
| Open Library     | Bring the active Pond library to the front.                                      |

Saving and switching libraries show confirmation details. Switching affects subsequent searches and saves. Save lookups include the originating library ID, so a stale result does not silently refer to another library.

### Native MCP support

The extension declares Pond's server directly in `ai.yaml`, using [Raycast's MCP configuration](https://developers.raycast.com/information/manifest#mcp-server):

```yaml
mcp:
  type: stdio
  command: /Applications/Pond.app/Contents/MacOS/Pond
  args: ["--mcp"]
```

Raycast launches this local process and makes its tools available through **Ask Pond** and `@pond`, alongside the eight tools above. No separate MCP installation or Local API Token is needed for the native MCP tools. The commands and the eight declared tools still use the local API, except for opening the library.

1. Install **Pond.app** in `/Applications` and open a library at least once.
2. In **Pond Settings → Model Context Protocol**, enable the capabilities you want: **Search Saves**, **Open in Pond**, or **Export Files**.
3. Open **Ask Pond** or mention `@pond` in Raycast AI.

Pond's native tools can search captions, OCR, transcripts, and notes; read saved content; list folders; run nested queries or similarity searches; and apply filters in Pond. With **Export Files** enabled, they can inspect conversion formats and presets, export files, compress images, and track or cancel jobs. Image compression replaces originals and records an undo operation in Pond.

Try `@pond search my saved transcripts for typography`, `@pond list the folders in my library`, or `@pond what export formats does Pond support?`.

The MCP process uses the library selected when it starts. After switching libraries, reconnect the MCP server before using its tools. If Pond is installed elsewhere, copy the executable path from **Pond Settings → Model Context Protocol → Advanced**, update `mcp.command` in `ai.yaml`, and rebuild the extension.

**Pond 1.0.1 limitation:** a live check initialized the installed server successfully, but `tools/list` failed with `Custom types cannot be represented in JSON Schema`. The process also emitted startup logs on stdout. Native MCP tools require a Pond build that fixes these server issues. The extension's regular commands use the separate local API; changing the API token does not fix MCP discovery.

## Data and storage

Commands and declared tools connect to Pond on your Mac through loopback HTTP. The extension stores the token in Raycast's password preference and never includes it in AI results. Native MCP tools communicate with Pond through a local stdio process. Search previews stay in the extension's local support directory, with up to 100 recent image files retained.

When you use Raycast AI, tool results are made available to your configured AI service. These can include metadata, library paths, and stored content such as transcripts or OCR returned by MCP tools. Ordinary commands do not require Raycast AI.

## Troubleshooting

| Problem                         | What to do                                                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Cannot connect                  | Open Pond and a library, check the API port, then run **Set up Pond** and press ⌘R.                                               |
| Token rejected                  | Copy a fresh token from Pond Settings and update the extension preferences.                                                       |
| Endpoint unavailable            | Update Pond to 1.0.1 or later and check that the Local API URL ends in `/api/v2`.                                                 |
| Library changed while searching | Press ⌘R. Pond invalidates pagination cursors when the library changes.                                                           |
| Library unavailable             | Reconnect its disk or open the library in Pond, then refresh.                                                                     |
| Browser capture fails           | Check macOS Automation permission and run the command from a supported browser.                                                   |
| Save timed out                  | Check Pond before retrying. The URL may have been accepted before the response was lost.                                          |
| MCP server cannot start         | Check that Pond is installed in `/Applications` and has a library. For another location, update `mcp.command` as described above. |
| MCP capability is off           | Enable the matching capability in **Pond Settings → Model Context Protocol**.                                                     |
| MCP shows a previous library    | Reconnect the MCP server after switching libraries. The setup connection check only checks the HTTP API.                          |

## Development

```sh
npm run dev        # Import into Raycast and watch for changes
npm run build      # Bundle commands and generate Raycast types
npm run typecheck
npm test
npm run lint
npx ray evals -I --exit-on-error
```

Run the build before the first type check. Tests cover the API contract, authentication, tagged saves, filters, library identity, file-copy previews, and errors. They use mocks and an ephemeral loopback server, without modifying a Pond library. AI evals use mocked tool results to check routing and arguments.

For a live check, connect a Pond token, search an existing save, filter by its tag, and open or copy it. Save a test URL with tags, then repeat the save to check the existing-URL behavior. Switch libraries and confirm that searches use the new library. Actual archiving and clipboard file copying need a running Pond app.
