# DocCheck Changelog

## [Version 1.4.1] - 2023-06-02

- Fixed: Some tables are now displayed better: Content within table cells spanning multiple columns is now displayed in two columns (this improvement was implemented because there is no "colspan" functionality in Markdown)

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
