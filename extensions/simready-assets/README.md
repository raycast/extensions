<div align="center">
    <img src="./assets/extension_icon.png" alt="SimReady Assets" width="100"/>
    <h3>SimReady Assets</h3>
    <p>Browse and preview simulation-ready 3D assets</p>
</div>

SimReady Assets is a Raycast extension that lets you browse, search, and preview [NVIDIA's SimReady Assets](https://huggingface.co/datasets/nvidia/simready-assets) on Hugging Face. Inspect individual files and download only the assets you need without downloading the full dataset.

## Usage

1. Run **Search Assets** in Raycast.
2. Search by name, type, or variant, such as `coffee cup`, `banana`, or `factory bolt`. Use the **All Types** dropdown to narrow the list. Types come from the asset names in the dataset.
3. Select an asset to see its preview. Metadata is hidden by default; choose **Show Metadata** / **Hide Metadata** in the actions menu, or press **⌘I** on macOS / **Ctrl+I** on Windows, to toggle its file count, folder size, model format, and license when available. The toggle applies while browsing and resets to hidden when you reopen the command.
4. Press **Enter** to browse the asset's files, grouped into models, payloads, textures, source files, previews, and metadata.
5. Open a file on Hugging Face, or choose **Download File in Browser** from its actions.

You can also use **Open Asset on Hugging Face** to open the selected asset folder or **Preview 3D Model on Hugging Face** to open its root USD model page.

## Raycast AI

Mention **@SimReady Assets** in Raycast AI to search and inspect NVIDIA's dataset:

- "Find banana assets and give me links to browse them."
- "Which asset types are available, and how many assets are in each?"
- "Show the size and license of food_produce_banana_m01 and give me a command to download just this asset folder."
- "List the texture files in food_produce_banana_m01 with individual download links."

The extension provides **Search Assets**, **List Asset Types**, **Get Asset Details**, and **List Asset Files** tools. Search uses keywords in asset names and supports type filters and pagination. File results include sizes, groups, and individual download links. Asset details include the preview URL, license when available, and a command for downloading one complete asset folder.

AI tools retrieve only file listings and small metadata. They return links and commands for you to use; they do not open your browser, download asset content, or run commands.

## Downloading a complete asset

USD models can reference textures, materials, and payloads in sibling folders. Downloading a single USD file may not produce a usable asset.

Choose **Download Asset Folder…** to see instructions and copy a command for the [Hugging Face CLI](https://huggingface.co/docs/huggingface_hub/en/guides/cli). Run it in your terminal (PowerShell on Windows) to download only the selected asset folder, preserving its structure:

```sh
hf download nvidia/simready-assets --repo-type dataset --revision main --include 'food_produce_banana_m01/**' --local-dir ./simready-assets
```

The extension copies this command; it does not run it. The CLI is optional and is only needed for downloading an entire asset folder. Browsing and browser downloads require no CLI, account, or API token for this public dataset.

## Network usage and caching

- Search loads the complete top-level folder index, following Hugging Face's pagination. It does not scan or download the entire dataset. The index is currently about 300 KB and is cached between command runs.
- Selecting an asset loads that folder's file listing, small JSON metadata, and one preview image up to 2 MB when available. Rapidly moving through the list cancels pending detail requests.
- Models, textures, and payloads are downloaded only when you explicitly choose a download action or run a copied command.
- Cached listings remain available if a refresh fails. Use **Refresh Catalog**, **Refresh Asset Details**, or **Refresh Files** to retry. An internet connection is required for uncached previews, file listings, and downloads.

## Credits

[SimReady Assets](https://huggingface.co/datasets/nvidia/simready-assets) is provided by [NVIDIA](https://huggingface.co/nvidia) and hosted on Hugging Face. The asset catalog, 3D models, and preview images shown in this extension come from NVIDIA's dataset.

This is an independently developed Raycast extension. Asset content and previews remain subject to the licenses included in their asset folders. The extension's MIT license applies to the extension code.

## Development

```sh
npm install
npm run dev
```

Then run **Search Assets** under **SimReady Assets** in Raycast.

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run evals
```

The tests mock HTTP requests and verify pagination, complete-catalog search, on-demand metadata loading, error handling, preview selection, AI tool results, and download URL/command generation. The AI evals in `ai.yaml` check tool selection, arguments, attribution, and download guidance. Neither suite downloads asset content.
