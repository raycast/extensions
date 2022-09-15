# Search Any Site

## How to search

1. Choose your search engine or website in the dropdown in top right (click the dropdown or press <kbd>⌘</kbd><kbd>P</kbd>).
1. Enter your search query. A list of search suggestions from Google will appear.
1. Press Enter to open the selected item in the selected site in your default browser.

## How to configure saved sites

1. Run the "Manage Sites" action (shortcut: <kbd>⌘</kbd><kbd>⏎</kbd>).
1. You will see your list of saved websites. When this extension is first installed, a
   list of default search engines is provided for you. Feel free to edit, add to, and
   delete from this list.

## Adding and editing saved sites

1. Enter the site's title. This must be unique among all your saved sites.
1. Enter the site's template URL. This is a URL whose search query is replaced with
   curly braces, e.g., `https://website.com/?q={}`. The curly braces indicate where your
   search query goes; when run, `{}` will be replaced with your (URL-encoded) search
   term.\
 For instance, to add an entry that uses Google, you'd use the template URL
 `https://www.google.com/search?q={}`. If you enter the search "my search terms",
 then the URL
 that is opened in your browser will be `https://www.google.com/search?q=my%20search%terms`.
1. Choose whether this should be the default site to search. If no default is selected,
   then the first site alphabetically will be used as the default.

## Preferences

### Prefill search from clipboard

If enabled, the search query will initially be set to the text on your clipboard.
