<!-- markdownlint-configure-file
{ // NOTE: trailing commas not allowed!
  "MD033": { "allowed_elements": ["kbd"] }
}
-->

# Search Any Site

## How to search

1. Choose your search engine or website in the dropdown in top right (click the dropdown or press <kbd>⌘</kbd><kbd>P</kbd>).
1. Enter your search query. A list of search suggestions from Google will appear.
1. If you type a URL (e.g., "example.com/page" or "https://example.com"), pressing Enter opens that URL directly.
1. Otherwise, press Enter to open the selected suggestion in the selected site in your default browser.

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

### Search Suggestions

<!-- markdownlint-disable-next-line MD036 -->
_Default: DuckDuckGo_

While entering a query, suggestions can be shown for your query, the same as you'd see
in a search engine in your browser. This setting controls the search engine to get
suggestions from: DuckDuckGo (the default), Google, or "None" if you don't want any
search suggestions.

### Prefill search from clipboard

<!-- markdownlint-disable-next-line MD036 -->
_Default: disabled_

If enabled, the search query will initially be set to the text on your clipboard.

### Strip DuckDuckGo's "Bangs" When Fetching Search Suggestions

<!-- markdownlint-disable-next-line MD036 -->
_Default: enabled_

DuckDuckGo supports "[bangs](https://duckduckgo.com/bang)", text-based shortcuts for
searching various sites on the web. For instance, when using DuckDuckGo, `!w macOS` will
not search DuckDuckGo for "!w macOS", but will instead search Wikipedia for "macOS";
`!w` is DuckDuckGo's "bang" shortcut for Wikipedia.

Depending on which site you're getting search suggestions from, bangs can interfere with
those suggestions. Therefore, if all of the following hold:

1. This setting is enabled
2. The selected search site is DuckDuckGo
3. The first word of the search query looks like a bang (i.e., it begins with an exclamation point)

then only the portion of the query without the bang will be used when fetching search
suggestions.

When getting search suggestions from DuckDuckGo, you might want this setting disabled
because DuckDuckGo _does_ understand bangs and can offer suggestions accordingly. When
using another search suggestion provider, which doesn't understand bangs, you probably
want this setting to be enabled because otherwise the bangs will be treated as part of
the query and will lead to worse search suggestions.

This setting does not affect what happens when you press enter to search; your query
text will always be searched verbatim on the site of your choosing. This setting only
affects the text used when fetching search suggestions.
