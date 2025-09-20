# Storybook Launcher

With this extension, you can quickly search for components in your Storybook and launch their respective stories directly in the browser. The extension also supports multiple Storybooks.

Note, this extension only supports [published Storybooks](https://storybook.js.org/docs/react/sharing/publish-storybook#page-top) using the [stories.json mode](https://storybook.js.org/docs/react/api/main-config-features#buildstoriesjson).

## Usage

1. When you open the extension for the first time, you'll be prompted to add a Storybook (name & URL). The name is used to identify the Storybook within the extension, and the URL is the base URL of the Storybook (no trailing slash).
2. The first level displays a list of all your Storybooks. Select the one you want to browse and press enter.
3. You'll then see a list of all the components within that Storybook. Select the component you want to browse and press enter.
4. Finally, you'll be presented with a list of all the stories for that component. Choose the specific story you want to open and press enter.

#### Search

You can use the search bar to filter results at all levels: storybooks, components, and stories.

#### Multiple Storybooks

You can add multiple Storybooks by using either the "Add Storybook" command or the shortcut cmd + n.

To delete a Storybook, simply select it from the list and use either the "Delete Storybook" command or the shortcut ctrl + x.
