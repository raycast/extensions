# DocCheck Changelog

# [Version 2.1.2] - 2025-03-11

- Fixed: articles with neither author nor aliases weren't shown when searching for them

## [Version 2.1.1] - 2023-09-04

- Fixed: removed the option to open an article with just the right arrow key (→) when there is a search query (so you move the cursor again with it)
- Fixed: changed the shortcut for "Open Article in Browser" to ⇧ + ⏎ (because ⌘ + ⏎ is now reserved by Raycast)

## [Version 2.1] - 2023-07-21

- NEW: Favourites - pin an article to the main screen, you will see a "★" in front of the navigation title at the bottom if the article is a favourite (shortcut to favourite and unfavourite: ⌘ + F; you can also unfavourite an article in Home)
- NEW: option to force reload Home with ⌘ + R
- NEW: option to clear all history or favourites (no shortcut, because there is no second prompt)
- NEW: show toast while fetching "Top Artikel", searching or loading an article
- NEW: show toast when you try to favourite an unloaded article
- Fixed: better support for links to non-existing articles (history and favourites now shows articles not yet written with a plus icon instead of a book in Home; there is no more Invalid last update date and ⏎ will open a browser so you can start writing this missing article; the error toast now shows a correct "Not found" message when opened)
- Fixed: Home is updated automatically (shows history items immediately, and also new favourites, unfavourites)
- Fixed: You can now read articles in the "Verbessere" section in raycast, instead of only editing them in the browser
- Fixed: Images with links are now displayed correctly (without returns, see e.g. article [Enterostoma](https://flexikon.doccheck.com/de/Enterostoma))
- Fixed: display error when article is not loaded and therefore cannot be favoured
- Fixed: some under the hood improvements (more unique listkeys in Home, check if item is still loading before you can bookmark it)

## [Version 2.0] - 2023-06-08

- NEW: Home - completely redesigned main screen shows the History from the last read articles (see below), "Neu erstellt", "Frisch verbessert", "Schreib über", "Verbessere" in addition to the "Top Artikel" (information from the [main page](https://flexikon.doccheck.com/de/Hauptseite))
- NEW: Cache - all of the above is now cached (you can change the time for a refresh in settings)
- NEW: Full Navigation - you can now go back and forth (like in a browser, pro-tip: use the arrow keys (← or →); on the first page you now go back via `pop` (same functionality as using the esc key), so you don't lose context)
- NEW: History - by default the last 3 articles are shown on the new home screen (you can change the number of entries in settings)
- NEW: Copy URL of current article with ⌘ + U
- NEW: open edit URL of current article in browser with ⌘ + E
- NEW: return to Home with ⌘ + H
- NEW: embedded DocCheck videos are now displayed as embedded link
- NEW: embedded Typeform quizzes now display as embedded link
- NEW: embedded Sketchfab 3D models now display as an embedded link
- NEW: embedded links are now displayed in a frame
- Fixed: Links to exclusive content (where you have to be logged in to see it) are now displayed better
- Fixed: even more complex tables ([Diuretikum](https://flexikon.doccheck.com/de/Diuretikum), [Rutherford-Klassifikation](https://flexikon.doccheck.com/de/Rutherford-Klassifikation), [Schizophrenie](https://flexikon.doccheck.com/de/Schizophrenie)) are now displayed correctly

## [Version 1.4.1] - 2023-06-03

- NEW: Authors are displayed
- Fixed: Some tables are now displayed better: Content within table cells spanning multiple columns is now displayed in two columns, cells spanning multiple rows have now a little arrow (this improvement was implemented because there is no "colspan" or "rowspan" functionality in Markdown)
- Fixed: note about a missing article is now in the body and not behind the headline

## [Version 1.4] - 2023-05-28

- NEW: added actions to search the original search term when viewing an article
- Fixed: show search term actions only when there is a query
- Fixed: show the actual search or article term for each action
- Fixed: search only the Flexikon (and not whole DocCheck) when using the "Flexikon Search" action (except for when nothing is found on Flexikon)

## [Version 1.3.3] - 2023-05-27

- NEW: embedded trinket code is now shown as embedded link
- Fixed: embedded YouTube videos are now shown as the original embedded link (doesn't look so sleek on the page, but there are no ads)

## [Version 1.3.2] - 2023-05-26

- NEW: embedded YouTube videos are now shown as a http://youtu.be/*** shortlink
- Fixed: removed links in the synonyms section

## [Version 1.3.1] - 2023-05-10

- Fixed: flickering loading indicator when no search result is found

## [Version 1.3] - 2023-05-07

- NEW: search in AMBOSS, Google, Wikipedia or the German Wikipedia if no entry is found.
- NEW: tooltips now also for titles of search results
- NEW: "Articulus brevis minimus" is removed
- Fixed: "Top articles" are now always displayed correctly and loaded only once (optimisation when displaying search results after leaving an article view via the "← Search \*" link and when deleting the search term)
- Fixed: if a top article was selected, "← Top article" now appears in the detail view; if "Open in: Browser" is selected in the settings, nothing is displayed any more, as it is possible to jump back with "Esc".
- Fixed: table calculation in article [Odds Ratio](https://flexikon.doccheck.com/de/Odds_Ratio) is now displayed correctly (apparently a table cannot start with an empty cell)
- Fixed: all german names deleted

## [Version 1.2.2] - 2023-04-12

- Fixed: the Calculation table in the article [Relatives Risiko](https://flexikon.doccheck.com/de/Relatives_Risiko) is now displayed correctly (apparently a table cannot start with an empty cell)

## [Version 1.2.1] - 2023-04-12

- bugfixes from @sxn (thanks!)

## [Version 1.2] - 2023-04-12

- NEW: when going back to the search, the search term is entered again
- UI adjustments: Loading of the article is now also displayed textually, the title comes directly from the article page after loading

## [Version 1.1.3] - 2023-04-12

- Fixed: the table differential diagnosis in the article [Scharlach](https://flexikon.doccheck.com/de/Scharlach) is now displayed correctly (Raycast 1.49.3 is needed to display tables)

## [Version 1.1.2] - 2023-04-10

- NEW: the first top article now shows the description available (on the [main page](https://flexikon.doccheck.com/de/Hauptseite)) as a tooltip
- Fixed: the article [Medizinische Abkürzungen](https://flexikon.doccheck.com/de/Medizinische_Abkürzungen) is now no longer displayed directly, as the table in it is apparently too long

## [Version 1.1.1] - 2023-04-09

- NEW: if there is no previous article available, you can now go back to the search

## [Version 1.1] - 2023-04-09

- NEW: open articles directly in Raycast via deep links (you can even go back once!)
- NEW: go back to search if there is no prevous article

## [Initial Version] - 2023-04-01

Initial version code
