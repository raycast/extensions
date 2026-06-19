# NumPy Documentation Search

A Raycast extension that lets you search the NumPy API reference and preview detailed documentation without leaving Raycast. Results include function signatures, descriptions, parameters, and return values, with quick actions to open the official docs in your browser.

## Features

- **Instant NumPy search**: Quickly filter the full API reference with fuzzy matching that surfaces the right functions, classes, and modules as you type.
- **Rich previews**: See inline call signatures, parameter tables, return values, and version notes without leaving Raycast.
- **Doc deep links**: Open the exact section on numpy.org in your browser when you need the full documentation context.
- **Copy-ready snippets**: Copy function signatures or doc URLs directly from the command for fast handoff into notebooks, scripts, or PRs.

## Certificate-Restricted Networks

If your work network blocks access to `https://numpy.org/doc/stable/`, the extension now shows a guided recovery state instead of only surfacing the fetch error.

You can point the command at downloaded local documentation:

1. Obtain a generated NumPy docs copy from [numpy/doc](https://github.com/numpy/doc) or from another machine that can reach `numpy.org`.
2. Extract the download locally and select the downloaded docs folder in Raycast. The extension will load the documentation from its `stable` subfolder.
3. Open the command preferences and set:
   - `Documentation Source` to `Local Docs Directory`, or leave it on `Online`
   - `Local Docs Directory` to the downloaded docs folder

If no local docs are configured, the extension requires live access to `numpy.org`. Local HTML docs provide full inline previews without network access.
