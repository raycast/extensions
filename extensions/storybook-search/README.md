# storybook search

Search components in Storybook.

## Usage

1. When you first open the extension, you will be prompted to enter the base URL of the Storybook server (e.g., http://localhost:6006).
2. Search components by story title (e.g., Layout/Grid/GridCell) or name (e.g., Docs). Once the component is found, press return to open the document of that component in the browser, or press cmd + return to copy the import path.

By default, all stories are included in search results. To narrow down the results, use the "RegExp to filter story names" setting in the extension configuration. For example, setting it to ^Docs$ will return only stories named "Docs".
