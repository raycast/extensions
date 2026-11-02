# JSON Kit

A local-first Raycast extension for inspecting and transforming JSON. JSON processing and search run locally; the extension does not send your input to a service.

## Use

Open **JSON Viewer** and paste JSON, or choose **Read Clipboard**. **Format and View** shows formatted text; use Actions to browse the structure, search the text, copy compact JSON, or export a file. The structure view supports expansion, node search, and copying JSON values and JSON Pointer paths. Duplicate paths are marked because repeated object keys cannot be distinguished by JSON Pointer alone.

The input view also supports searching the raw text, escaping valid JSON to a complete JSON string, and decoding a complete JSON string. Regular expressions use JavaScript syntax without surrounding `/`, are case-sensitive by default, and can search invalid JSON input. Search uses a separate worker with a one-second timeout; at most 500 matches are returned and truncated results are marked.

Input is not automatically saved. Export requires a user-selected directory and filename; existing files require explicit confirmation before replacement. Copying to the clipboard can expose data to clipboard history or other applications.

To keep the extension responsive, input is limited to 1 MiB, JSON tree depth to 128, and parsed nodes to 50,000. Formatting and compression preserve number tokens and duplicate keys. Character counts are Unicode code points; empty text has one line.

## Development

Use Node.js 22.22.2 or newer, npm, and Raycast. Install dependencies with `npm install`, then run `npm run dev` to load the extension in Raycast. `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` run the project checks. Installing dependencies and Raycast's own update and development workflows can use the network; JSON processing does not require one.
