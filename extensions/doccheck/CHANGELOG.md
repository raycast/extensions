# DocCheck Changelog

## [Version 1.3.1] - 2023-05-10

- Fix: flickering loading indicator when no search result is found

## [Version 1.3] - 2023-05-07

- NEW: Search in AMBOSS, Google, Wikipedia or the German Wikipedia if no entry is found.
- NEW: Tooltips now also for titles of search results
- NEW: "Articulus brevis minimus" is removed
- Fix: "Top articles" are now always displayed correctly and loaded only once (optimisation when displaying search results after leaving an article view via the "← Search \*" link and when deleting the search term)
- Fix: if a top article was selected, "← Top article" now appears in the detail view; if "Open in: Browser" is selected in the settings, nothing is displayed any more, as it is possible to jump back with "Esc".
- Fix: Table calculation in article [Odds Ratio](https://flexikon.doccheck.com/de/Odds_Ratio) is now displayed correctly (apparently a table cannot start with an empty cell)
- Fix: all german names deleted

## [Version 1.2.2] - 2023-04-12

- Fix: the Calculation table in the article [Relatives Risiko](https://flexikon.doccheck.com/de/Relatives_Risiko) is now displayed correctly (apparently a table cannot start with an empty cell)

## [Version 1.2.1] - 2023-04-12

- Bugfixes from @sxn (thanks!)

## [Version 1.2] - 2023-04-12

- NEW: when going back to the search, the search term is entered again
- UI adjustments: Loading of the article is now also displayed textually, the title comes directly from the article page after loading

## [Version 1.1.3] - 2023-04-12

- Fix: the table differential diagnosis in the article [Scharlach](https://flexikon.doccheck.com/de/Scharlach) is now displayed correctly (Raycast 1.49.3 is needed to display tables)

## [Version 1.1.2] - 2023-04-10

- NEW: the first top article now shows the description available (on the [main page](https://flexikon.doccheck.com/de/Hauptseite)) as a tooltip
- Fix: the article [Medizinische Abkürzungen](https://flexikon.doccheck.com/de/Medizinische_Abkürzungen) is now no longer displayed directly, as the table in it is apparently too long

## [Version 1.1.1] - 2023-04-09

- NEW: if there is no previous article available, you can now go back to the search

## [Version 1.1] - 2023-04-09

- NEW: open articles directly in Raycast via deep links (you can even go back once!)
- NEW: go back to search if there is no prevous article

## [Version 1.1] - 2023-04-09

- NEW: Open article directly in Raycast using deeplinks (you can even go back one time!)

## [Initial Version] - 2023-04-01

Initial version code
