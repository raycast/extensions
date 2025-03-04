# SnippetsLab Raycast Extension

The official Raycast extension for [SnippetsLab](https://www.renfei.org/snippets-lab).

## Prerequisites

- SnippetsLab version 2.5 or higher.
- To use the “Paste to Active App” action, ensure that Raycast has accessibility access.

## Main Features

- Search for any snippet in your SnippetsLab library directly from Raycast.
- Set a search filter to refine your search by folder, tag, or language.
- View snippet contents (including each fragment) without leaving Raycast.
- Perform actions such as Copy to Clipboard, Paste to Active App, and Open in SnippetsLab.

## Settings

There are a few settings you can customize to make the extension better fit your workflow. To adjust
these settings, go to **Raycast Settings** > **Extensions** > **Search SnippetsLab Library**.

### Save Last Search Filter

By default, the search filter is reset when you close the Raycast window. Enable this option if you
prefer to keep the filter selection persistent across multiple sessions.

### Search Result

Configure which information is displayed in the snippet list:

- Search Context: When searching, show an excerpt around the first matching keyword.
- Folder, Tags, Languages: Display the folder, tags, and languages associated with each snippet.
  This information is omitted automatically if there is none.

### Snippet Action

Control the order of actions in the action menu (activated with `Command-K`). You can also use
`Return` to invoke the first action or `Command-Return` to trigger the second action directly.

Note: The “Show Snippet Details” action is available only when viewing the snippets list.

### CLI Path

The extension communicates with SnippetsLab using the `lab` command-line tool bundled with the app.
In most cases, the extension will locate the tool automatically. If not, or if you want to specify a
custom location, you can manually enter the absolute path to the `lab` binary here.

For more information on the `lab` command, see
[lab(1) Command Manual](https://www.renfei.org/snippets-lab/manual/mac/tips-and-tricks/lab.html).

## Contributing

Contributions are warmly welcomed! Please keep the following in mind:

- Before making significant changes, reach out to us at support@renfei.org with your proposed
  design. This ensures that your contribution aligns with the future roadmap of both SnippetsLab
  and this extension.
- Follow the existing code style, and ensure your code is formatted with Prettier, as configured.
- Document all non-trivial code.
- Update relevant documentation, including this README, if applicable.
