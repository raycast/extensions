# Polars Documentation Search

A Raycast extension that lets you search the Polars API reference and preview detailed documentation without leaving Raycast. Results include signatures, descriptions, parameters, and return values, with quick actions to open the official docs in your browser.

## Features

- **Instant Polars search**: Quickly filter the API reference with fuzzy matching that surfaces the right functions, classes, and modules as you type.
- **Rich previews**: See inline signatures, parameter details, and return values without leaving Raycast.
- **Doc deep links**: Open the exact section on docs.pola.rs in your browser when you need full documentation context.
- **Copy-ready snippets**: Copy signatures or doc URLs directly from the command for fast handoff into notebooks, scripts, or PRs.
- **Local docs fallback**: Keep searching from a downloaded Polars docs folder when the live documentation cannot be reached.

## Local Documentation

The command uses the official online docs by default. To use downloaded docs, open the command preferences, set
**Documentation Source** to **Local**, and choose **Local Docs Directory**.

The selected folder should contain a `stable` directory or symlink with the Python API docs:

```text
stable/objects.inv
stable/<html documentation tree>
```

If the online docs fail and **Local Docs Directory** is configured, the extension automatically falls back to that local
copy. This also supports checkouts where `stable` is a text-file symlink placeholder containing the target directory name.
