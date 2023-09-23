# Comics Calendar Changelog

## Minor Update - 2023-09-09

- fix: function inside `BrowseCollections.tsx` had the wrong name.
- refactor: `Manga` and `Collection` interfaces has their own id.

## Minor Update - 2023-09-07

- Added a random string generator function to prevent unexpected behaviors caused by keys.
- Made minor improvements to the Grid view in the `Browse Publications` feature.
- Enhanced the description in the `README.md` file for better clarity and completeness.

## Minor Update - 2023-07-28

- **[New]** Renamed extension title from `Mis Comics MX` to `Manga Mexico` for a more fitting name.
- **[New]** Changed extension name from `manga-schedule` to `manga-calendar` to align with the new title.s
- **[New]** Introduced a new extension icon to improve visual representation.
- **[New]** Added screenshots to enhance the user experience.

## Minor Update - 2023-07-27

- Implemented the ability to search by Editorial in the `Current month schedule` command for more efficient browsing.

## Third Update - 2023-07-26

- Added a new command, `Browse Publications`, enabling users to explore all available publications.
- Introduced three distinct views:
  - Current month schedule (list).
  - **[New]** All manga collections published in Mexico (grid).
  - **[New]** All manga in a collection (list).

## Second Update - 2023-07-25

- Enhanced filtering capabilities with the introduction of a **Dropdown** feature.
  - Improved filtering logic to seamlessly handle both searchText and selectedDate filters.
  - Optimized the `publicationDates` variable using `useMemo` to boost performance.
  - Simplified conditional rendering of `List.Section` for cleaner code.

  In this version, significant improvements were made to the `SearchMangaList` component. The filtering logic was enhanced to simultaneously handle both searchText and selectedDate filters, allowing for more flexible and accurate results. Additionally, the `publicationDates` variable was optimized using `useMemo`, ensuring it recalculates only when necessary. The conditional rendering of `List.Section` was simplified for improved code readability.

## First Update - 2023-07-24

- Conducted a major refactor of `SearchMangaList.ts`.
  - Removed redundant state variables 'year' and 'filteredList'.
  - Utilized object destructuring for current date, month, and year.
  - Replaced redundant `useEffect` with `useMemo` for manga list filtering.
  - Utilized more descriptive variable names for enhanced code readability.
  - Renamed the variable `acc` in the reduce function to improve code clarity.

## Initial Version - 2023-07-23

- Introduced the initial version with a single available view: `Current month schedule` (simple list).
- In the list view, users can access a detailed view with the `Cmd+Enter` action.
- In the list view, users can navigate to web portals of major sellers or the publisher's official website with the `Cmd+Shift+Enter` action for added convenience.
