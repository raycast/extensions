# Comics Calendar Changelog

## [Minor Update] - 2023-07-28

- **[New]** Change extension title `Mis Comics MX` to `Comics Mexico``
- **[New]** Change extension name `manga-schedule` to `manga-calendar`
- **[New]** Extension icon was added;
- **[New]** Screenshots were added;

## [Minor Update] - 2023-07-27

- Now you can search by Editorial in `Current month schedule` command.

## [Third Update] - 2023-07-26

- New command `collection` for browsing all publications.
- Now there are three views available:
  - Current month schedule (list).
  - **[New]** All manga collections published in Mexico (grid)
  - **[New]** All manga in a collection (list)

## [Second Update] - 2023-07-25

- Now you can filter by dates with the new **Drowdown**.
  - Improved filtering logic to handle both searchText and selectedDate filters
  - Optimized publicationDates variable with useMemo
  - Simplified conditional rendering of List.Section

In this version, significant improvements were made to the SearchMangaList component. The filtering logic was enhanced to simultaneously handle both searchText and selectedDate filters, allowing for more flexible and accurate results.

Additionally, the publicationDates variable was optimized using useMemo, ensuring that it only recalculates when the mangaList changes. The conditional rendering of List.Section was simplified, resulting in cleaner and more concise code.

## [First Update] - 2023-07-24

- `SearchMangaList.ts` got a huge refactor.
  - Removed redundant state variables 'year' and 'filteredList'.
  - Utilized object destructuring for current date, month, and year.
  - Replaced redundant useEffect with useMemo for manga list filtering.
  - Used more descriptive variable names for better code readability.
  - The variable `acc` in the reduce function was renamed because wasn't descriptive.

## [Initial Version] - 2023-07-23

- One view available: Current month schedule (list [simple]).
- In the list view, you can see a *detailed view* with the action "Cmd+Enter".
- In the list view, you can go to the web portals of the main sellers or to the publisher's official website with the action "Cmd+Shift+Enter".
