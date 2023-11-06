# PubMe Changelog

## [Version 1.4.1] - 2023-09-04
- Fixed: Changed the variable "retmax" to "required" (Raycast otherwise does not set the default value but "undefined," which breaks the whole search)
- Fixed: removed the option to open an article with just the right arrow key (→) when there is a search query (so you move the cursor again with it)
- Fixed: changed the shortcut for "Open Article in Browser" to ⇧ + ⏎ (because ⌘ + ⏎ is now reserved by Raycast)
- Fixed: changed the shortcut for "Copy PMID" to ⇧ + P (because ⌘ + P is now reserved by Raycast)

## [Version 1.4] - 2023-07-21
- NEW: History - by default the last 3 articles are shown on the new home screen (you can change the number of entries in settings)
- NEW: Favourites - pin an article to the main screen, you will see a "★" in front of the navigation title at the bottom if the article is a favourite (shortcut to favourite and unfavourite: ⌘ + F; you can also unfavourite an article in Home)
- NEW: option to clear all history or favourites (no shortcut, because there is no second prompt)
- NEW: show toast while fetching Trending articles, searching or loading an article
- NEW: option to force reload Trending articles with ⌘ + R

## [Version 1.3] - 2023-06-20
- NEW: Cache - trending articles are now cached and only refreshed daily by default (you can change the time for a refresh in settings or turn this feature of)
- NEW: Faster Navigation - just use the arrow keys to open (→) or close (←) an entry
- NEW: Copy URL of current article with ⌘ + U
- NEW: Copy the PMID of current article with ⌘ + P
- Fixed: If you have just opened an article it now is displayed instantly

## [Version 1.2] - 2023-04-13

- NEW: Copy the DOI quickly by just pressing ⌘ + D
- Fix: show only one Date when electronic publication date equals the publication date

## [Version 1.1.2] - 2023-04-13

- Fix: show "Online ahead of print", when it is not published yet

## [Version 1.1.1] - 2023-04-13

- Fix: renaming to PubMe

## [Version 1.1] - 2023-04-13

- NEW: add API key to make up to 10 Requests/Second

## [Initial Version] - 2023-04-09

Initial version code